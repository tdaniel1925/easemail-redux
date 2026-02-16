/**
 * Attachment Upload API Route
 * Handles uploading attachments to Supabase Storage
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { uploadAttachment } from '@/lib/storage/attachments';

export async function POST(request: NextRequest) {
  try {
    // Get current user
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Parse FormData
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const messageId = formData.get('message_id') as string | null;

    // Validate inputs
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (!messageId) {
      return NextResponse.json({ error: 'Missing message_id' }, { status: 400 });
    }

    // Validate file size (50 MB limit)
    const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'File size exceeds 50 MB limit' },
        { status: 400 }
      );
    }

    // Upload to Supabase Storage
    const result = await uploadAttachment(file, user.id, messageId);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Upload failed' },
        { status: 500 }
      );
    }

    // Log usage
    await supabase.from('usage_tracking').insert({
      user_id: user.id,
      feature: 'attachment_upload',
      count: 1,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      attachment: result.attachment,
    });
  } catch (error: any) {
    console.error('Attachment upload error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to upload attachment' },
      { status: 500 }
    );
  }
}
