import { NextResponse } from 'next/server';
// Health check endpoint

// Health check endpoint for monitoring and load balancers
export async function GET() {
  try {
    const healthData = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      version: process.env.npm_package_version || '1.0.0',
      uptime: process.uptime(),
      memory: process.env.NODE_ENV === 'production' ? undefined : process.memoryUsage(),
      checks: {
        environment: true,
        scorestream_api_key: !!process.env.SCORESTREAM_API_KEY,
        scorestream_api_key_length: process.env.SCORESTREAM_API_KEY?.length || 0,
        scorestream_access_token: !!process.env.SCORESTREAM_ACCESS_TOKEN,
        scorestream_access_token_length: process.env.SCORESTREAM_ACCESS_TOKEN?.length || 0,
        scorestream_api_base: process.env.SCORESTREAM_API_BASE || 'not set',
      },
    };

    // Basic service checks
    const allChecksPass = Object.values(healthData.checks).every(check => check === true);
    
    return NextResponse.json(healthData, {
      status: allChecksPass ? 200 : 503,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });

  } catch (error) {
    return NextResponse.json(
      {
        status: 'error',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Health check failed',
      },
      { status: 503 }
    );
  }
}

// Simple ping endpoint
export async function HEAD() {
  return new Response(null, { status: 200 });
}
