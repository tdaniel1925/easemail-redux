import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    // Check database connection
    const supabase = await createClient();
    const { error } = await supabase.from('users').select('id').limit(1).single();

    // If error is "PGRST116" it means no rows, which is fine - DB is connected
    // Any other error means there's a problem
    const dbConnected = !error || error.code === 'PGRST116';

    if (!dbConnected) {
      return NextResponse.json(
        {
          status: 'error',
          timestamp: new Date().toISOString(),
          version: process.env.npm_package_version || '0.1.0',
          database: 'disconnected',
          error: error?.message,
        },
        { status: 503 }
      );
    }

    return NextResponse.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '0.1.0',
      database: 'connected',
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: 'error',
        timestamp: new Date().toISOString(),
        version: process.env.npm_package_version || '0.1.0',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 503 }
    );
  }
}
