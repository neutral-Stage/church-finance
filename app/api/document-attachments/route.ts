import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, createAdminClient } from '@/lib/supabase';

const adminSupabase = createAdminClient();

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const billId = searchParams.get('bill_id');
    const ledgerEntryId = searchParams.get('ledger_entry_id');
    const ledgerSubgroupId = searchParams.get('ledger_subgroup_id');
    const category = searchParams.get('category');
    const isConfidential = searchParams.get('is_confidential');

    let query = supabase
      .from('document_attachments')
      .select('*')
      .order('created_at', { ascending: false });

    if (billId) {
      query = query.eq('bill_id', billId);
    }
    if (ledgerEntryId) {
      query = query.eq('ledger_entry_id', ledgerEntryId);
    }
    if (ledgerSubgroupId) {
      query = query.eq('ledger_subgroup_id', ledgerSubgroupId);
    }
    if (category) {
      query = query.eq('category', category);
    }
    if (isConfidential !== null) {
      query = query.eq('is_confidential', isConfidential === 'true');
    }

    const { data: attachments, error } = await query;

    if (error) {
      console.error('Error fetching document attachments:', error);
      return NextResponse.json(
        { error: 'Failed to fetch document attachments' },
        { status: 500 }
      );
    }

    return NextResponse.json(attachments);
  } catch (error) {
    console.error('Error in GET /api/document-attachments:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      bill_id,
      ledger_entry_id,
      ledger_subgroup_id,
      file_name,
      file_size,
      file_type,
      mime_type,
      storage_path,
      storage_bucket = 'documents',
      title,
      description,
      category = 'general',
      is_primary = false,
      is_confidential = false,
      tags = [],
      version = 1,
      metadata = {}
    } = body;

    // Validate required fields
    if (!file_name || !file_size || !storage_path) {
      return NextResponse.json(
        { error: 'File name, size, and storage path are required' },
        { status: 400 }
      );
    }

    // Validate that attachment is associated with exactly one entity
    const entityCount = [bill_id, ledger_entry_id, ledger_subgroup_id].filter(Boolean).length;
    if (entityCount !== 1) {
      return NextResponse.json(
        { error: 'Document must be associated with exactly one entity (bill, ledger entry, or subgroup)' },
        { status: 400 }
      );
    }

    // Create the document attachment
    const { data: attachment, error: attachmentError } = await adminSupabase
      .from('document_attachments')
      .insert({
        bill_id: bill_id || null,
        ledger_entry_id: ledger_entry_id || null,
        ledger_subgroup_id: ledger_subgroup_id || null,
        file_name,
        file_size: parseInt(file_size),
        file_type: file_type || null,
        mime_type: mime_type || null,
        storage_path,
        storage_bucket,
        title: title || file_name,
        description: description || null,
        category,
        is_primary,
        is_confidential,
        tags,
        version,
        metadata,
        uploaded_by: user.id,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (attachmentError) {
      console.error('Error creating document attachment:', attachmentError);
      return NextResponse.json(
        { error: 'Failed to create document attachment' },
        { status: 500 }
      );
    }

    return NextResponse.json(attachment, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/document-attachments:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createServerClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      id,
      title,
      description,
      category,
      is_primary,
      is_confidential,
      tags,
      metadata
    } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Document attachment ID is required' },
        { status: 400 }
      );
    }

    // Update the document attachment
    const updateData: Record<string, unknown> = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (category !== undefined) updateData.category = category;
    if (is_primary !== undefined) updateData.is_primary = is_primary;
    if (is_confidential !== undefined) updateData.is_confidential = is_confidential;
    if (tags !== undefined) updateData.tags = tags;
    if (metadata !== undefined) updateData.metadata = metadata;
    updateData.updated_at = new Date().toISOString();

    const { data: attachment, error: updateError } = await adminSupabase
      .from('document_attachments')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating document attachment:', updateError);
      return NextResponse.json(
        { error: 'Failed to update document attachment' },
        { status: 500 }
      );
    }

    return NextResponse.json(attachment);
  } catch (error) {
    console.error('Error in PUT /api/document-attachments:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createServerClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Document attachment ID is required' },
        { status: 400 }
      );
    }

    // Check if attachment exists
    const { data: existingAttachment, error: fetchError } = await adminSupabase
      .from('document_attachments')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !existingAttachment) {
      return NextResponse.json(
        { error: 'Document attachment not found' },
        { status: 404 }
      );
    }

    // Delete the document attachment
    const { error: deleteError } = await adminSupabase
      .from('document_attachments')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('Error deleting document attachment:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete document attachment' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { message: 'Document attachment deleted successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error in DELETE /api/document-attachments:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}