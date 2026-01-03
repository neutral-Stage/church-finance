// AI Chat API Route - Handle chat messages with streaming support
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';
import { generateChatResponse, generateChatResponseStream, ChatMessage } from '@/lib/ai';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
    try {
        // Get authenticated user
        const supabase = await createServerClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        // Parse request body
        const body = await request.json();
        const { message, conversationHistory, churchId, stream = false, conversation_id } = body;

        if (!message || typeof message !== 'string') {
            return NextResponse.json(
                { error: 'Message is required' },
                { status: 400 }
            );
        }

        if (!churchId) {
            return NextResponse.json(
                { error: 'Church context is required' },
                { status: 400 }
            );
        }

        // Verify user has access to this church
        const { data: userRole, error: roleError } = await supabase
            .from('user_church_roles')
            .select('role_id, roles!inner(name)')
            .eq('user_id', user.id)
            .eq('church_id', churchId)
            .eq('is_active', true)
            .single();

        if (roleError || !userRole) {
            return NextResponse.json(
                { error: 'You do not have access to this church' },
                { status: 403 }
            );
        }

        // Create or get conversation if not provided
        let activeConversationId = conversation_id;
        if (!activeConversationId) {
            const { data: conv, error: convError } = await supabase
                .from('ai_conversations')
                .insert({
                    church_id: churchId,
                    user_id: user.id,
                    title: message.substring(0, 50)
                })
                .select()
                .single();

            if (!convError && conv) {
                activeConversationId = conv.id;
            }
        }

        const chatOptions = {
            churchId,
            userId: user.id,
            conversationHistory: conversationHistory as ChatMessage[] | undefined,
            enableFunctions: true,
        };

        // Handle streaming response
        if (stream) {
            const encoder = new TextEncoder();

            const readableStream = new ReadableStream({
                async start(controller) {
                    try {
                        const generator = generateChatResponseStream(message, chatOptions);

                        for await (const chunk of generator) {
                            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: chunk })}\n\n`));
                        }

                        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
                        controller.close();
                    } catch (error) {
                        console.error('Streaming error:', error);
                        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: 'Streaming error' })}\n\n`));
                        controller.close();
                    }
                },
            });

            return new Response(readableStream, {
                headers: {
                    'Content-Type': 'text/event-stream',
                    'Cache-Control': 'no-cache',
                    'Connection': 'keep-alive',
                },
            });
        }

        // Non-streaming response
        const result = await generateChatResponse(message, chatOptions);

        // Optionally save to conversation history
        if (activeConversationId) {
            await saveMessage(supabase, activeConversationId, 'user', message);
            await saveMessage(supabase, activeConversationId, 'assistant', result.response, {
                functionCalls: result.functionCalls,
            });
        }

        return NextResponse.json({
            response: result.response,
            functionCalls: result.functionCalls,
            conversationId: activeConversationId
        });

    } catch (error) {
        console.error('Chat API error:', error);

        // Handle API key not configured error
        if (error instanceof Error && error.message.includes('API key not configured')) {
            return NextResponse.json(
                { error: 'AI service not configured. Please add your API key to the environment variables.' },
                { status: 503 }
            );
        }

        return NextResponse.json(
            { error: 'Failed to process chat message' },
            { status: 500 }
        );
    }
}

async function saveMessage(
    supabase: Awaited<ReturnType<typeof createServerClient>>,
    conversationId: string,
    role: 'user' | 'assistant' | 'system',
    content: string,
    metadata?: any
) {
    const { error } = await supabase
        .from('ai_messages')
        .insert({
            conversation_id: conversationId,
            role,
            content,
            metadata: metadata || {},
        });

    if (error) {
        console.error('Error saving message:', error);
    }
}

