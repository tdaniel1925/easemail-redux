/**
 * Server-Sent Events (SSE) Stream for Real-Time Updates
 * Streams real-time email updates to connected clients
 * Uses Supabase Realtime to listen for database changes
 *
 * Reference: https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events
 */

import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/realtime/stream
 *
 * Opens a Server-Sent Events stream for real-time email updates
 *
 * Authentication: Required (user must be signed in)
 *
 * Response format:
 * Content-Type: text/event-stream
 * Event types:
 * - connected: Initial connection established
 * - message: New message received or updated
 * - heartbeat: Keep-alive ping
 *
 * Example event:
 * event: message
 * data: {"id":"123","subject":"New email","from_email":"sender@example.com"}
 *
 * Response:
 * - 200: Stream established
 * - 401: Unauthorized (not signed in)
 * - 500: Internal server error
 */
export async function GET(req: NextRequest) {
  // Create Supabase client to check authentication
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return new Response('Unauthorized', { status: 401 });
  }

  // Create SSE stream
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      // Helper to send SSE message
      const sendEvent = (event: string, data: unknown) => {
        const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
        controller.enqueue(encoder.encode(message));
      };

      // Send connection established event
      sendEvent('connected', {
        userId: user.id,
        timestamp: new Date().toISOString(),
      });

      // Set up heartbeat to keep connection alive (every 30 seconds)
      const heartbeatInterval = setInterval(() => {
        try {
          sendEvent('heartbeat', { timestamp: new Date().toISOString() });
        } catch (error) {
          // Connection closed
          clearInterval(heartbeatInterval);
        }
      }, 30000);

      // Subscribe to Supabase Realtime changes on messages table
      // Filter to only this user's messages
      const channel = supabase
        .channel(`realtime:messages:${user.id}`)
        .on(
          'postgres_changes',
          {
            event: '*', // Listen to INSERT, UPDATE, DELETE
            schema: 'public',
            table: 'messages',
            filter: `user_id=eq.${user.id}`,
          },
          (payload: any) => {
            try {
              // Send message event to client
              sendEvent('message', {
                eventType: payload.eventType,
                message: payload.new,
                old: payload.old,
                timestamp: new Date().toISOString(),
              });
            } catch (error) {
              console.error('[SSE Stream] Error sending message event:', error);
            }
          }
        )
        .subscribe((status: string) => {
          if (status === 'SUBSCRIBED') {
            console.log('[SSE Stream] Subscribed to realtime updates for user:', user.id);
          } else if (status === 'CLOSED') {
            console.log('[SSE Stream] Realtime subscription closed for user:', user.id);
            clearInterval(heartbeatInterval);
          } else if (status === 'CHANNEL_ERROR') {
            console.error('[SSE Stream] Realtime subscription error for user:', user.id);
            clearInterval(heartbeatInterval);
            controller.close();
          }
        });

      // Track connection in database (optional - for monitoring active connections)
      // TODO: Enable after migration 010_realtime_sync.sql is applied
      // const connectionId = `${user.id}-${Date.now()}`;
      // await supabase.from('realtime_connections').insert({
      //   user_id: user.id,
      //   connection_id: connectionId,
      //   connected_at: new Date().toISOString(),
      // });

      // Clean up on connection close
      req.signal.addEventListener('abort', async () => {
        console.log('[SSE Stream] Connection closed for user:', user.id);
        clearInterval(heartbeatInterval);

        // Unsubscribe from Supabase Realtime
        await supabase.removeChannel(channel);

        // TODO: Enable after migration 010_realtime_sync.sql is applied
        // await supabase
        //   .from('realtime_connections')
        //   .delete()
        //   .eq('connection_id', connectionId);

        controller.close();
      });
    },
  });

  // Return SSE response
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no', // Disable buffering in Nginx
    },
  });
}
