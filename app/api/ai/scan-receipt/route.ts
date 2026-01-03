
import { createServerClient } from '@/lib/supabase-server';
import { analyzeImage } from '@/lib/ai/ai-service';
import { NextRequest, NextResponse } from 'next/server';
import { getSelectedChurch } from '@/lib/server-church-context';

export async function POST(req: NextRequest) {
    try {
        // Auth check
        const supabase = await createServerClient();
        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Church context check
        const selectedChurch = await getSelectedChurch();
        if (!selectedChurch) {
            return NextResponse.json(
                { error: 'No church selected' },
                { status: 400 }
            );
        }

        const formData = await req.formData();
        const file = formData.get('file') as File;

        if (!file) {
            return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
        }

        // Validate file type
        if (!file.type.startsWith('image/')) {
            return NextResponse.json({ error: 'File must be an image' }, { status: 400 });
        }

        // Convert file to base64
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const base64 = buffer.toString('base64');

        // Analyze image
        const result = await analyzeImage(base64, file.type);

        return NextResponse.json(result);
    } catch (error) {
        console.error('Receipt scan error:', error);
        return NextResponse.json(
            { error: 'Failed to analyze receipt' },
            { status: 500 }
        );
    }
}
