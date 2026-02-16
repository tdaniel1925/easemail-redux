/**
 * POST /api/senders/block
 * Phase 6, Task 117: Block/unblock email sender
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

const BlockSenderSchema = z.object({
  email: z.string().email(),
  block: z.boolean(), // true = block, false = unblock
});

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validationResult = BlockSenderSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: validationResult.error.errors },
        { status: 400 }
      );
    }

    const { email, block } = validationResult.data;

    // Use upsert to handle both create and update in one operation
    // This avoids the type error with is_blocked column
    const { data: contact, error: upsertError } = await supabase
      .from('contacts')
      .upsert(
        {
          user_id: user.id,
          email,
          is_blocked: block,
          updated_at: new Date().toISOString(),
          created_by: user.id,
        },
        {
          onConflict: 'user_id,email',
        }
      )
      .select('id')
      .single();

    if (upsertError) {
      console.error('Error blocking/unblocking sender:', upsertError);
      return NextResponse.json(
        { error: 'Failed to block/unblock sender' },
        { status: 500 }
      );
    }

    // Log event for audit trail
    await supabase.from('events').insert({
      actor_id: user.id,
      event_type: (block ? 'contact.blocked' : 'contact.unblocked') as any,
      entity_type: 'contact',
      entity_id: contact?.id || null,
      metadata: {
        email,
      },
    });

    return NextResponse.json({
      success: true,
      action: block ? 'blocked' : 'unblocked',
      email,
    });
  } catch (error) {
    console.error('Error blocking/unblocking sender:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to block/unblock sender' },
      { status: 500 }
    );
  }
}
