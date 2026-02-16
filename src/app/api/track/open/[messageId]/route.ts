'use server';

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/track/open/[messageId]
 * Tracking pixel endpoint for read receipts
 * Returns a 1x1 transparent GIF and logs the open event
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { messageId: string } }
) {
  const messageId = params.messageId;

  try {
    const supabase = await createClient();

    // Get the message
    const { data: message, error: messageError } = await supabase
      .from('messages')
      .select('id, user_id, read_receipt_enabled, read_receipt_opened_at')
      .eq('id', messageId)
      .single();

    if (messageError || !message) {
      console.error('Message not found for read receipt:', messageError);
      // Still return tracking pixel even if message not found
      return new NextResponse(TRACKING_PIXEL, {
        status: 200,
        headers: {
          'Content-Type': 'image/gif',
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        },
      });
    }

    // Only track if read receipt is enabled and hasn't been opened yet
    if (message.read_receipt_enabled && !message.read_receipt_opened_at) {
      const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
      const userAgent = request.headers.get('user-agent') || 'unknown';

      // Update message with read receipt data
      const { error: updateError } = await supabase
        .from('messages')
        .update({
          read_receipt_opened_at: new Date().toISOString(),
          read_receipt_ip: ip,
          read_receipt_user_agent: userAgent,
        })
        .eq('id', messageId);

      if (updateError) {
        console.error('Failed to update read receipt:', updateError);
      } else {
        // Log event
        try {
          await supabase.from('events').insert({
            actor_id: message.user_id,
            event_type: 'email.read_receipt_opened' as any,
            entity_type: 'message',
            entity_id: messageId,
            payload: {
              message_id: messageId,
              opened_at: new Date().toISOString(),
              ip,
              user_agent: userAgent,
            },
          });
        } catch (eventError) {
          console.error('Failed to log read receipt event:', eventError);
        }
      }
    }
  } catch (error) {
    console.error('Read receipt tracking error:', error);
  }

  // Always return tracking pixel regardless of success/failure
  return new NextResponse(TRACKING_PIXEL, {
    status: 200,
    headers: {
      'Content-Type': 'image/gif',
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
    },
  });
}

// 1x1 transparent GIF (base64 encoded)
const TRACKING_PIXEL = Buffer.from(
  'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
  'base64'
);
