// AI Service - Core functionality for chat and embeddings
// Supports Groq, Gemini, OpenAI with flexible provider switching

import { GoogleGenerativeAI, GenerativeModel, Content } from '@google/generative-ai';
import Groq from 'groq-sdk';
import { getAIConfig, SYSTEM_PROMPT, AIFunctionName } from './ai-config';
import { executeFunctionCall } from '@/lib/ai/data-functions';

let genAI: GoogleGenerativeAI | null = null;
let geminiModel: GenerativeModel | null = null;
let embeddingModel: GenerativeModel | null = null;
let groqClient: Groq | null = null;

const config = getAIConfig();

// Initialize Groq client
function getGroqClient(): Groq {
    if (!groqClient) {
        if (!config.apiKey) {
            throw new Error('Groq API key not configured. Please set GROQ_API_KEY in your environment.');
        }
        groqClient = new Groq({ apiKey: config.apiKey });
    }
    return groqClient;
}

// Initialize Gemini client for embeddings and optionally chat
function initializeGemini(forEmbeddings = true) {
    // If we are strictly initializing for embeddings, use the embedding key.
    // If not (general Gemini usage like Vision), check if the main provider is Gemini.
    // If main provider is NOT Gemini (e.g. Groq), we must fallback to the embeddingApiKey 
    // (which is expected to be the Google Key) for proper Gemini initialization.
    const isGeminiMain = config.provider === 'gemini';
    const apiKey = (forEmbeddings || !isGeminiMain) ? config.embeddingApiKey : config.apiKey;

    if (!apiKey) {
        throw new Error('Google AI API key not configured. Please set GOOGLE_AI_API_KEY in your environment.');
    }

    genAI = new GoogleGenerativeAI(apiKey);

    if (forEmbeddings) {
        embeddingModel = genAI.getGenerativeModel({ model: config.embeddingModel });
    } else {
        // Even if Groq is main, if we call this, we want a Gemini model instance (e.g. for Vision)
        geminiModel = genAI.getGenerativeModel({
            model: 'gemini-1.5-flash', // Force Flash for vision/utility tasks if strictly requesting Gemini
            systemInstruction: SYSTEM_PROMPT,
        });
        embeddingModel = genAI.getGenerativeModel({ model: config.embeddingModel });
    }
}

// Get Gemini model (for Gemini provider)
function getGeminiModel(): GenerativeModel {
    if (!geminiModel) {
        initializeGemini(false);
    }
    return geminiModel!;
}

function getEmbeddingModel(): GenerativeModel {
    if (!embeddingModel) {
        initializeGemini(true);
    }
    return embeddingModel!;
}

export interface ChatMessage {
    role: 'user' | 'assistant' | 'system';
    content: string;
    functionCall?: {
        name: string;
        args: Record<string, unknown>;
    };
    functionResult?: {
        name: string;
        result: unknown;
    };
}

export interface ChatOptions {
    churchId: string;
    userId: string;
    conversationHistory?: ChatMessage[];
    enableFunctions?: boolean;
}

// Generate chat response with Groq
async function generateGroqChatResponse(
    message: string,
    options: ChatOptions
): Promise<{ response: string; functionCalls?: Array<{ name: string; args: Record<string, unknown>; result: unknown }> }> {
    const groq = getGroqClient();

    // Build conversation messages
    const messages: Groq.Chat.ChatCompletionMessageParam[] = [
        { role: 'system', content: SYSTEM_PROMPT },
        ...(options.conversationHistory || []).map(msg => ({
            role: msg.role as 'user' | 'assistant' | 'system',
            content: msg.content,
        })),
        { role: 'user', content: message },
    ];

    const completion = await groq.chat.completions.create({
        model: config.model,
        messages,
        max_tokens: config.maxTokens,
        temperature: config.temperature,
    });

    const responseText = completion.choices[0]?.message?.content || '';

    // Check for function calls in the response
    const functionCalls: Array<{ name: string; args: Record<string, unknown>; result: unknown }> = [];

    // Check if response contains function call indicators
    const functionCallMatch = responseText.match(/\[FUNCTION_CALL:(\w+)\]\s*({[\s\S]*?})\s*\[\/FUNCTION_CALL\]/);

    if (functionCallMatch && options.enableFunctions !== false) {
        const functionName = functionCallMatch[1] as AIFunctionName;
        const argsJson = functionCallMatch[2];

        try {
            const args = JSON.parse(argsJson);

            // Execute the function
            const functionResult = await executeFunctionCall(functionName, args, {
                churchId: options.churchId,
                userId: options.userId,
            });

            functionCalls.push({
                name: functionName,
                args,
                result: functionResult,
            });

            // Generate follow-up response with function result
            const followUpCompletion = await groq.chat.completions.create({
                model: config.model,
                messages: [
                    ...messages,
                    { role: 'assistant', content: responseText },
                    { role: 'user', content: `Function ${functionName} returned: ${JSON.stringify(functionResult, null, 2)}\n\nPlease provide a natural language summary of this data for the user.` },
                ],
                max_tokens: config.maxTokens,
                temperature: config.temperature,
            });

            return {
                response: followUpCompletion.choices[0]?.message?.content || '',
                functionCalls,
            };
        } catch (error) {
            console.error('Function call error:', error);
            // Return original response if function call fails
        }
    }

    return { response: responseText, functionCalls };
}

// Generate chat response with Gemini
async function generateGeminiChatResponse(
    message: string,
    options: ChatOptions
): Promise<{ response: string; functionCalls?: Array<{ name: string; args: Record<string, unknown>; result: unknown }> }> {
    const chatModel = getGeminiModel();

    // Build conversation history
    const history: Content[] = (options.conversationHistory || []).map(msg => ({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }],
    }));

    // Create chat session
    const chat = chatModel.startChat({
        history,
        generationConfig: {
            maxOutputTokens: 4096,
            temperature: 0.7,
        },
    });

    // Send message and get response
    const result = await chat.sendMessage(message);
    const response = result.response;

    // Check for function calls in the response
    const functionCalls: Array<{ name: string; args: Record<string, unknown>; result: unknown }> = [];

    // Parse the response text for function call patterns
    const responseText = response.text();

    // Check if response contains function call indicators
    const functionCallMatch = responseText.match(/\[FUNCTION_CALL:(\w+)\]\s*({[\s\S]*?})\s*\[\/FUNCTION_CALL\]/);

    if (functionCallMatch && options.enableFunctions !== false) {
        const functionName = functionCallMatch[1] as AIFunctionName;
        const argsJson = functionCallMatch[2];

        try {
            const args = JSON.parse(argsJson);

            // Execute the function
            const functionResult = await executeFunctionCall(functionName, args, {
                churchId: options.churchId,
                userId: options.userId,
            });

            functionCalls.push({
                name: functionName,
                args,
                result: functionResult,
            });

            // Generate follow-up response with function result
            const followUpResult = await chat.sendMessage(
                `Function ${functionName} returned: ${JSON.stringify(functionResult, null, 2)}\n\nPlease provide a natural language summary of this data for the user.`
            );

            return {
                response: followUpResult.response.text(),
                functionCalls,
            };
        } catch (error) {
            console.error('Function call error:', error);
            // Return original response if function call fails
        }
    }

    return { response: responseText, functionCalls };
}

// Main chat response function - routes to appropriate provider
export async function generateChatResponse(
    message: string,
    options: ChatOptions
): Promise<{ response: string; functionCalls?: Array<{ name: string; args: Record<string, unknown>; result: unknown }> }> {
    const config = getAIConfig();

    switch (config.provider) {
        case 'groq':
            return generateGroqChatResponse(message, options);
        case 'gemini':
            return generateGeminiChatResponse(message, options);
        default:
            throw new Error(`Provider ${config.provider} not yet implemented`);
    }
}

// Generate streaming chat response
export async function* generateChatResponseStream(
    message: string,
    options: ChatOptions
): AsyncGenerator<string, void, unknown> {
    const config = getAIConfig();

    if (config.provider === 'groq') {
        const groq = getGroqClient();

        const messages: Groq.Chat.ChatCompletionMessageParam[] = [
            { role: 'system', content: SYSTEM_PROMPT },
            ...(options.conversationHistory || []).map(msg => ({
                role: msg.role as 'user' | 'assistant' | 'system',
                content: msg.content,
            })),
            { role: 'user', content: message },
        ];

        const stream = await groq.chat.completions.create({
            model: config.model,
            messages,
            max_tokens: config.maxTokens,
            temperature: config.temperature,
            stream: true,
        });

        for await (const chunk of stream) {
            const text = chunk.choices[0]?.delta?.content;
            if (text) {
                yield text;
            }
        }
    } else if (config.provider === 'gemini') {
        const chatModel = getGeminiModel();

        // Build conversation history
        const history: Content[] = (options.conversationHistory || []).map(msg => ({
            role: msg.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: msg.content }],
        }));

        // Create chat session
        const chat = chatModel.startChat({
            history,
            generationConfig: {
                maxOutputTokens: 4096,
                temperature: 0.7,
            },
        });

        // Send message with streaming
        const result = await chat.sendMessageStream(message);

        for await (const chunk of result.stream) {
            const text = chunk.text();
            if (text) {
                yield text;
            }
        }
    } else {
        throw new Error(`Streaming not supported for provider ${config.provider}`);
    }
}

// Generate embeddings for text (always uses Gemini for best quality)
export async function generateEmbedding(text: string): Promise<number[]> {
    const embedModel = getEmbeddingModel();

    const result = await embedModel.embedContent(text);
    return result.embedding.values;
}

// Generate embeddings for multiple texts
export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
    const embedModel = getEmbeddingModel();

    const results = await Promise.all(
        texts.map(text => embedModel.embedContent(text))
    );

    return results.map(r => r.embedding.values);
}

// Process voice transcription and generate response
export async function processVoiceInput(
    transcription: string,
    options: ChatOptions
): Promise<{ response: string; transcription: string; functionCalls?: Array<{ name: string; args: Record<string, unknown>; result: unknown }> }> {
    // Add voice-specific processing hints
    const processedMessage = `[Voice Input] ${transcription}`;

    const result = await generateChatResponse(processedMessage, options);

    return {
        ...result,
        transcription,
    };
}

// Analyze intent from user message
export async function analyzeIntent(message: string): Promise<{
    intent: 'query' | 'create' | 'search' | 'insight' | 'unknown';
    entities: Record<string, string>;
    confidence: number;
}> {
    const config = getAIConfig();

    const prompt = `Analyze this user message and extract the intent and entities.
  
Message: "${message}"

Respond ONLY with a JSON object in this exact format:
{
  "intent": "query" | "create" | "search" | "insight" | "unknown",
  "entities": { extracted entities as key-value pairs },
  "confidence": number between 0 and 1
}

Intent types:
- query: User wants to retrieve specific data (transactions, balances, etc.)
- create: User wants to add new data (transaction, member, etc.)
- search: User wants to search for something
- insight: User wants analysis or summary
- unknown: Cannot determine intent`;

    let responseText: string;

    if (config.provider === 'groq') {
        const groq = getGroqClient();
        const completion = await groq.chat.completions.create({
            model: config.model,
            messages: [{ role: 'user', content: prompt }],
            max_tokens: 500,
            temperature: 0.3,
        });
        responseText = completion.choices[0]?.message?.content || '';
    } else {
        const chatModel = getGeminiModel();
        const result = await chatModel.generateContent(prompt);
        responseText = result.response.text();
    }

    try {
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            return JSON.parse(jsonMatch[0]);
        }
    } catch (error) {
        console.error('Intent analysis parse error:', error);
    }

    return {
        intent: 'unknown',
        entities: {},
        confidence: 0,
    };
}

// Analyze image for receipt data extraction
export async function analyzeImage(
    imageBase64: string,
    mimeType: string = 'image/jpeg'
): Promise<{
    date?: string;
    amount?: number;
    vendor?: string;
    category?: string;
    description?: string;
    confidence: number;
}> {
    const chatModel = getGeminiModel();

    // Prepare prompt
    const prompt = `Analyze this receipt image and extract the following details:
1. Transaction Date (YYYY-MM-DD)
2. Total Amount (number)
3. Vendor/Merchant Name
4. Category (e.g., Utilities, Food, Supplies, Maintenance, Salary, Rent)
5. Short description of items

Respond ONLY with a JSON object in this format:
{
  "date": "YYYY-MM-DD",
  "amount": 0.00,
  "vendor": "string",
  "category": "string",
  "description": "string",
  "confidence": 0.0-1.0
}
If a field cannot be found, leave it null/undefined.`;

    const result = await chatModel.generateContent([
        prompt,
        {
            inlineData: {
                data: imageBase64,
                mimeType,
            },
        },
    ]);

    const responseText = result.response.text();

    try {
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            return JSON.parse(jsonMatch[0]);
        }
    } catch (error) {
        console.error('Image analysis parse error:', error);
    }

    return { confidence: 0 };
}
