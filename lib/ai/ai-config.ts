// AI Configuration for Church Finance App
// Supports Groq (default), Gemini, and other providers

export interface AIConfig {
    provider: 'groq' | 'gemini' | 'openai' | 'anthropic';
    apiKey: string;
    model: string;
    embeddingModel: string;
    embeddingProvider: 'gemini' | 'openai'; // Groq doesn't have embeddings
    embeddingApiKey: string;
    maxTokens: number;
    temperature: number;
}

// Get AI configuration from environment
export function getAIConfig(): AIConfig {
    const provider = (process.env.AI_PROVIDER as AIConfig['provider']) || 'groq';

    const configs: Record<string, Partial<AIConfig>> = {
        groq: {
            apiKey: process.env.GROQ_API_KEY || '',
            model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
            // Groq doesn't have embeddings, use Gemini as fallback
            embeddingModel: 'text-embedding-004',
            embeddingProvider: 'gemini',
            embeddingApiKey: process.env.GOOGLE_AI_API_KEY || '',
            maxTokens: 8192,
            temperature: 0.7,
        },
        gemini: {
            apiKey: process.env.GOOGLE_AI_API_KEY || '',
            model: 'gemini-1.5-flash',
            embeddingModel: 'text-embedding-004',
            embeddingProvider: 'gemini',
            embeddingApiKey: process.env.GOOGLE_AI_API_KEY || '',
            maxTokens: 8192,
            temperature: 0.7,
        },
        openai: {
            apiKey: process.env.OPENAI_API_KEY || '',
            model: 'gpt-4-turbo-preview',
            embeddingModel: 'text-embedding-3-small',
            embeddingProvider: 'openai',
            embeddingApiKey: process.env.OPENAI_API_KEY || '',
            maxTokens: 4096,
            temperature: 0.7,
        },
        anthropic: {
            apiKey: process.env.ANTHROPIC_API_KEY || '',
            model: 'claude-3-sonnet-20240229',
            embeddingModel: 'text-embedding-004',
            embeddingProvider: 'gemini',
            embeddingApiKey: process.env.GOOGLE_AI_API_KEY || '',
            maxTokens: 4096,
            temperature: 0.7,
        },
    };

    return {
        provider,
        ...configs[provider],
    } as AIConfig;
}

// System prompt for church finance context
export const SYSTEM_PROMPT = `You are a helpful AI assistant for a Church Finance Management System. You help users:

1. **Get Insights**: Provide financial summaries, trends, and analysis about:
   - Fund balances (Management, Mission, Building funds)
   - Transaction history (income and expenses)
   - Offerings and contributions
   - Bills and payment schedules
   - Member contributions

2. **Search Data**: Find specific records using natural language queries like:
   - "Show transactions from last month"
   - "Find all utility payments"
   - "List pending bills"

3. **Filter Data**: Help narrow down results by:
   - Date ranges
   - Amount ranges
   - Categories
   - Fund types
   - Status (pending, paid, overdue)

4. **Add Data**: Help create new records when requested:
   - New transactions (income/expense)
   - New offerings
   - New members
   - Always confirm before creating records

**Important Guidelines**:
- Always be respectful and professional
- Format currency values properly
- When showing data, use clear formatting
- Ask for clarification if the request is ambiguous
- For data modifications, always ask for confirmation
- If you don't have access to certain data, say so clearly
- Respect the church context and multi-tenant isolation

**Available Data Types**:
- Funds: Management, Mission, Building (and custom funds)
- Transaction Types: income, expense
- Payment Methods: cash, bank
- Offering Types: tithe, lords_day, special, mission
- Bill Statuses: pending, paid, overdue
- Bill Frequencies: one-time, monthly, quarterly, yearly`;

// Function definitions for structured data operations
export const AI_FUNCTIONS = [
    {
        name: 'get_fund_balances',
        description: 'Get current balances for all funds or a specific fund',
        parameters: {
            type: 'object',
            properties: {
                fund_name: {
                    type: 'string',
                    description: 'Optional fund name to filter (Management, Mission, Building)',
                },
            },
        },
    },
    {
        name: 'get_transactions',
        description: 'Get transactions with optional filters',
        parameters: {
            type: 'object',
            properties: {
                type: {
                    type: 'string',
                    enum: ['income', 'expense'],
                    description: 'Filter by transaction type',
                },
                fund_name: {
                    type: 'string',
                    description: 'Filter by fund name',
                },
                category: {
                    type: 'string',
                    description: 'Filter by category',
                },
                start_date: {
                    type: 'string',
                    description: 'Start date (ISO format)',
                },
                end_date: {
                    type: 'string',
                    description: 'End date (ISO format)',
                },
                limit: {
                    type: 'number',
                    description: 'Maximum number of results (default 10)',
                },
            },
        },
    },
    {
        name: 'get_offerings',
        description: 'Get offerings with optional filters',
        parameters: {
            type: 'object',
            properties: {
                type: {
                    type: 'string',
                    enum: ['tithe', 'lords_day', 'special', 'mission'],
                    description: 'Filter by offering type',
                },
                start_date: {
                    type: 'string',
                    description: 'Start date (ISO format)',
                },
                end_date: {
                    type: 'string',
                    description: 'End date (ISO format)',
                },
                limit: {
                    type: 'number',
                    description: 'Maximum number of results',
                },
            },
        },
    },
    {
        name: 'get_bills',
        description: 'Get bills with optional filters',
        parameters: {
            type: 'object',
            properties: {
                status: {
                    type: 'string',
                    enum: ['pending', 'paid', 'overdue'],
                    description: 'Filter by bill status',
                },
                category: {
                    type: 'string',
                    description: 'Filter by category',
                },
                fund_name: {
                    type: 'string',
                    description: 'Filter by fund name',
                },
                limit: {
                    type: 'number',
                    description: 'Maximum number of results',
                },
            },
        },
    },
    {
        name: 'get_advances',
        description: 'Get advances with optional filters',
        parameters: {
            type: 'object',
            properties: {
                status: {
                    type: 'string',
                    enum: ['outstanding', 'partial', 'returned'],
                    description: 'Filter by advance status',
                },
                limit: {
                    type: 'number',
                    description: 'Maximum number of results',
                },
            },
        },
    },
    {
        name: 'get_financial_summary',
        description: 'Get a comprehensive financial summary including totals and trends',
        parameters: {
            type: 'object',
            properties: {
                period: {
                    type: 'string',
                    enum: ['week', 'month', 'quarter', 'year'],
                    description: 'Time period for the summary',
                },
            },
        },
    },
    {
        name: 'search_records',
        description: 'Search across all records using semantic similarity',
        parameters: {
            type: 'object',
            properties: {
                query: {
                    type: 'string',
                    description: 'Search query in natural language',
                },
                tables: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'Optional list of tables to search in',
                },
                limit: {
                    type: 'number',
                    description: 'Maximum number of results',
                },
            },
            required: ['query'],
        },
    },
    {
        name: 'create_transaction',
        description: 'Create a new transaction (requires confirmation)',
        parameters: {
            type: 'object',
            properties: {
                type: {
                    type: 'string',
                    enum: ['income', 'expense'],
                    description: 'Transaction type',
                },
                amount: {
                    type: 'number',
                    description: 'Transaction amount',
                },
                description: {
                    type: 'string',
                    description: 'Transaction description',
                },
                category: {
                    type: 'string',
                    description: 'Transaction category',
                },
                fund_name: {
                    type: 'string',
                    description: 'Fund to associate with',
                },
                payment_method: {
                    type: 'string',
                    enum: ['cash', 'bank'],
                    description: 'Payment method',
                },
                transaction_date: {
                    type: 'string',
                    description: 'Date of transaction (ISO format)',
                },
            },
            required: ['type', 'amount', 'description', 'category', 'fund_name', 'payment_method'],
        },
    },
    {
        name: 'create_offering',
        description: 'Create a new offering record (requires confirmation)',
        parameters: {
            type: 'object',
            properties: {
                type: {
                    type: 'string',
                    enum: ['tithe', 'lords_day', 'special', 'mission'],
                    description: 'Offering type',
                },
                amount: {
                    type: 'number',
                    description: 'Total offering amount',
                },
                service_date: {
                    type: 'string',
                    description: 'Date of service (ISO format)',
                },
                fund_allocations: {
                    type: 'object',
                    description: 'How to allocate to funds (e.g., {"Management": 1000, "Mission": 500})',
                },
                notes: {
                    type: 'string',
                    description: 'Optional notes',
                },
            },
            required: ['type', 'amount', 'service_date', 'fund_allocations'],
        },
    },
];

export type AIFunctionName = typeof AI_FUNCTIONS[number]['name'];
