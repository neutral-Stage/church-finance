// AI Voice API Route - Process voice transcriptions
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';
import { processVoiceInput } from '@/lib/ai';

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
        const { transcription, churchId, conversationHistory } = body;

        if (!transcription || typeof transcription !== 'string') {
            return NextResponse.json(
                { error: 'Transcription is required' },
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

        // Process the voice input
        const result = await processVoiceInput(transcription, {
            churchId,
            userId: user.id,
            conversationHistory,
            enableFunctions: true,
        });

        return NextResponse.json({
            transcription: result.transcription,
            response: result.response,
            functionCalls: result.functionCalls,
        });

    } catch (error) {
        console.error('Voice API error:', error);

        // Handle API key not configured error
        if (error instanceof Error && error.message.includes('API key not configured')) {
            return NextResponse.json(
                { error: 'AI service not configured. Please add your API key to the environment variables.' },
                { status: 503 }
            );
        }

        return NextResponse.json(
            { error: 'Failed to process voice input' },
            { status: 500 }
        );
    }
}
