// Vector Search - Semantic search using embeddings
import { createClient } from '@supabase/supabase-js';
import { generateEmbedding } from './ai-service';

// Create admin client for server-side operations
function getSupabaseAdmin() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    return createClient(supabaseUrl, serviceRoleKey);
}

export interface EmbeddingRecord {
    sourceTable: string;
    sourceId: string;
    content: string;
    metadata?: Record<string, unknown>;
}

export interface SearchResult {
    id: string;
    sourceTable: string;
    sourceId: string;
    content: string;
    similarity: number;
    metadata: Record<string, unknown>;
}

// Store an embedding for a record
export async function storeEmbedding(
    record: EmbeddingRecord,
    churchId: string
): Promise<void> {
    const supabase = getSupabaseAdmin();

    // Generate embedding for the content
    const embedding = await generateEmbedding(record.content);

    // Upsert the embedding record
    const { error } = await supabase
        .from('document_embeddings')
        .upsert({
            church_id: churchId,
            source_table: record.sourceTable,
            source_id: record.sourceId,
            content: record.content,
            embedding: embedding,
            metadata: record.metadata || {},
            updated_at: new Date().toISOString(),
        }, {
            onConflict: 'source_table,source_id',
        });

    if (error) {
        console.error('Error storing embedding:', error);
        throw error;
    }
}

// Store embeddings for multiple records
export async function storeEmbeddings(
    records: EmbeddingRecord[],
    churchId: string
): Promise<void> {
    // Process in batches to avoid rate limits
    const batchSize = 10;

    for (let i = 0; i < records.length; i += batchSize) {
        const batch = records.slice(i, i + batchSize);
        await Promise.all(batch.map(record => storeEmbedding(record, churchId)));
    }
}

// Search for similar documents
export async function searchSimilar(
    query: string,
    churchId: string,
    options: {
        tables?: string[];
        threshold?: number;
        limit?: number;
    } = {}
): Promise<SearchResult[]> {
    const supabase = getSupabaseAdmin();

    // Generate embedding for the query
    const queryEmbedding = await generateEmbedding(query);

    const threshold = options.threshold || 0.7;
    const limit = options.limit || 10;

    // Use the search function we created in the migration
    const { data, error } = await supabase.rpc('search_similar_documents', {
        query_embedding: queryEmbedding,
        match_threshold: threshold,
        match_count: limit,
        p_church_id: churchId,
    });

    if (error) {
        console.error('Vector search error:', error);
        throw error;
    }

    // Filter by tables if specified
    let results = data || [];

    if (options.tables && options.tables.length > 0) {
        results = results.filter((r: SearchResult) => options.tables!.includes(r.sourceTable));
    }

    return results;
}

// Generate content string for a transaction
export function generateTransactionContent(transaction: {
    type: string;
    amount: number;
    description: string;
    category: string;
    payment_method: string;
    transaction_date: string;
    fund_name?: string;
}): string {
    return `${transaction.type} transaction: ${transaction.description}. Amount: $${transaction.amount}. Category: ${transaction.category}. Payment method: ${transaction.payment_method}. Date: ${transaction.transaction_date}. Fund: ${transaction.fund_name || 'Unknown'}.`;
}

// Generate content string for a bill
export function generateBillContent(bill: {
    vendor_name: string;
    amount: number;
    category: string;
    status: string;
    due_date: string;
    frequency: string;
    notes?: string;
}): string {
    return `Bill from ${bill.vendor_name}. Amount: $${bill.amount}. Category: ${bill.category}. Status: ${bill.status}. Due date: ${bill.due_date}. Frequency: ${bill.frequency}.${bill.notes ? ` Notes: ${bill.notes}` : ''}`;
}

// Generate content string for an offering
export function generateOfferingContent(offering: {
    type: string;
    amount: number;
    service_date: string;
    notes?: string;
}): string {
    return `${offering.type} offering. Amount: $${offering.amount}. Service date: ${offering.service_date}.${offering.notes ? ` Notes: ${offering.notes}` : ''}`;
}

// Generate content string for a member
export function generateMemberContent(member: {
    name: string;
    fellowship_name?: string;
    location?: string;
    job?: string;
    phone?: string;
}): string {
    const parts = [`Church member: ${member.name}`];
    if (member.fellowship_name) parts.push(`Fellowship: ${member.fellowship_name}`);
    if (member.location) parts.push(`Location: ${member.location}`);
    if (member.job) parts.push(`Occupation: ${member.job}`);
    return parts.join('. ') + '.';
}

// Sync embeddings for all records in a table
export async function syncTableEmbeddings(
    tableName: 'transactions' | 'bills' | 'offerings' | 'members',
    churchId: string
): Promise<{ synced: number; errors: number }> {
    const supabase = getSupabaseAdmin();
    let synced = 0;
    let errors = 0;

    // Fetch records based on table
    let query;

    switch (tableName) {
        case 'transactions':
            query = supabase
                .from('transactions')
                .select(`*, funds!inner(id, name, church_id)`)
                .eq('funds.church_id', churchId);
            break;

        case 'bills':
            query = supabase
                .from('bills')
                .select(`*, funds!inner(id, name, church_id)`)
                .eq('funds.church_id', churchId);
            break;

        case 'offerings':
            query = supabase.from('offerings').select('*');
            break;

        case 'members':
            query = supabase.from('members').select('*');
            break;
    }

    const { data, error } = await query;

    if (error) {
        console.error(`Error fetching ${tableName}:`, error);
        throw error;
    }

    if (!data) return { synced: 0, errors: 0 };

    // Generate embeddings for each record
    for (const record of data) {
        try {
            let content: string;

            switch (tableName) {
                case 'transactions':
                    content = generateTransactionContent({
                        ...record,
                        fund_name: record.funds?.name,
                    });
                    break;

                case 'bills':
                    content = generateBillContent(record);
                    break;

                case 'offerings':
                    content = generateOfferingContent(record);
                    break;

                case 'members':
                    content = generateMemberContent(record);
                    break;
            }

            await storeEmbedding(
                {
                    sourceTable: tableName,
                    sourceId: record.id,
                    content,
                    metadata: { record },
                },
                churchId
            );

            synced++;
        } catch (err) {
            console.error(`Error syncing ${tableName} record ${record.id}:`, err);
            errors++;
        }
    }

    return { synced, errors };
}
