import { NextRequest, NextResponse } from 'next/server';

const SCORESTREAM_API_URL = process.env.SCORESTREAM_API_URL || 'https://api.scorestream.com';
const SCORESTREAM_API_KEY = process.env.SCORESTREAM_API_KEY;

interface ScoreStreamRequest {
  method: string;
  params: Record<string, unknown>;
}

export async function POST(request: NextRequest) {
  try {
    const { method, params }: ScoreStreamRequest = await request.json();

    // Validate required fields
    if (!method) {
      return NextResponse.json(
        { error: 'Method is required' },
        { status: 400 }
      );
    }

    // Check for API key
    if (!SCORESTREAM_API_KEY) {
      console.error('SCORESTREAM_API_KEY is not configured');
      return NextResponse.json(
        { error: 'ScoreStream API key not configured' },
        { status: 500 }
      );
    }

    // Build JSON-RPC request body with API key
    const rpcBody = {
      jsonrpc: '2.0',
      id: Date.now(),
      method,
      params: {
        ...params,
        apiKey: SCORESTREAM_API_KEY,
      },
    };

    // Call the real ScoreStream API
    const response = await fetch(SCORESTREAM_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(rpcBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('ScoreStream API error:', response.status, errorText);
      return NextResponse.json(
        {
          error: 'ScoreStream API request failed',
          details: `Status ${response.status}: ${errorText}`
        },
        { status: response.status }
      );
    }

    const data = await response.json();

    // Check for JSON-RPC error in response
    if (data.error) {
      console.error('ScoreStream API returned error:', data.error);
      return NextResponse.json(
        {
          error: 'ScoreStream API error',
          details: data.error.message || JSON.stringify(data.error)
        },
        { status: 400 }
      );
    }

    return NextResponse.json(data);

  } catch (error) {
    console.error('ScoreStream proxy error:', error);
    return NextResponse.json(
      {
        error: 'ScoreStream API request failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}