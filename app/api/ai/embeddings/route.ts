// AI Embeddings API Route - Generate and search embeddings
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';
import { searchSimilar, syncTableEmbeddings } from '@/lib/ai';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GET - Search similar documents
export async function GET(request: NextRequest) {
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

        // Get query parameters
        const searchParams = request.nextUrl.searchParams;
        const query = searchParams.get('query');
        const churchId = searchParams.get('churchId');
        const tables = searchParams.get('tables')?.split(',');
        const limit = parseInt(searchParams.get('limit') || '10', 10);
        const threshold = parseFloat(searchParams.get('threshold') || '0.7');

        if (!query) {
            return NextResponse.json(
                { error: 'Query parameter is required' },
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

        // Search for similar documents
        const results = await searchSimilar(query, churchId, {
            tables,
            threshold,
            limit,
        });

        return NextResponse.json({
            query,
            results,
            count: results.length,
        });

    } catch (error) {
        console.error('Embeddings search error:', error);

        return NextResponse.json(
            { error: 'Failed to search embeddings' },
            { status: 500 }
        );
    }
}

// POST - Sync embeddings for a table
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
        const { table, churchId } = body;

        if (!table || !['transactions', 'bills', 'offerings', 'members'].includes(table)) {
            return NextResponse.json(
                { error: 'Valid table name is required (transactions, bills, offerings, members)' },
                { status: 400 }
            );
        }

        if (!churchId) {
            return NextResponse.json(
                { error: 'Church context is required' },
                { status: 400 }
            );
        }

        // Verify user has admin access to this church
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

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const roleName = (userRole.roles as any)?.name;
        if (roleName !== 'admin' && roleName !== 'treasurer') {
            return NextResponse.json(
                { error: 'Admin or Treasurer role required to sync embeddings' },
                { status: 403 }
            );
        }

        // Sync embeddings for the table
        const result = await syncTableEmbeddings(table, churchId);

        return NextResponse.json({
            table,
            synced: result.synced,
            errors: result.errors,
            message: `Synced ${result.synced} records with ${result.errors} errors`,
        });

    } catch (error) {
        console.error('Embeddings sync error:', error);

        return NextResponse.json(
            { error: 'Failed to sync embeddings' },
            { status: 500 }
        );
    }
}
