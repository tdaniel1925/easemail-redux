/**
 * Attachment Download API Route
 * Handles downloading attachments from Supabase Storage
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { downloadAttachment } from '@/lib/storage/attachments';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Get current user
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const attachmentId = params.id;

    // Get storage path from query params
    const { searchParams } = new URL(request.url);
    const storagePath = searchParams.get('path');
    const filename = searchParams.get('name') || 'attachment';

    if (!storagePath) {
      return NextResponse.json({ error: 'Missing storage path' }, { status: 400 });
    }

    // Verify user owns this attachment (path should start with their user_id)
    if (!storagePath.startsWith(`${user.id}/`)) {
      return NextResponse.json(
        { error: 'Unauthorized access to attachment' },
        { status: 403 }
      );
    }

    // Download from Supabase Storage
    const result = await downloadAttachment(storagePath);

    if (!result.success || !result.blob) {
      return NextResponse.json(
        { error: result.error || 'Download failed' },
        { status: 500 }
      );
    }

    // Convert Blob to ArrayBuffer
    const arrayBuffer = await result.blob.arrayBuffer();

    // Log usage
    await supabase.from('usage_tracking').insert({
      user_id: user.id,
      feature: 'attachment_download',
      count: 1,
      timestamp: new Date().toISOString(),
    });

    // Return file as response with proper headers
    return new NextResponse(arrayBuffer, {
      status: 200,
      headers: {
        'Content-Type': result.blob.type || 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': result.blob.size.toString(),
      },
    });
  } catch (error: any) {
    console.error('Attachment download error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to download attachment' },
      { status: 500 }
    );
  }
}
