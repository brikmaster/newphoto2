import { NextRequest, NextResponse } from 'next/server';

// ScoreStream API uses a single endpoint with JSON-RPC format
const SCORESTREAM_API_URL = 'https://scorestream.com/api/';

interface ScoreStreamRequest {
  method: string;
  params: any;
}

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get('content-type') || '';

    // Handle multipart form data (for games.posts.add with image upload)
    if (contentType.includes('multipart/form-data')) {
      return await handleMultipartRequest(request);
    }

    // Handle JSON requests
    return await handleJsonRequest(request);

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

async function handleMultipartRequest(request: NextRequest) {
  const formData = await request.formData();
  const method = formData.get('method') as string;

  if (method === 'games.posts.add') {
    return await handleGamesPostsAdd(formData);
  }

  return NextResponse.json(
    { error: `Unknown multipart method: ${method}` },
    { status: 400 }
  );
}

async function handleGamesPostsAdd(formData: FormData) {
  const gameId = formData.get('gameId') as string;
  const backgroundPicture = formData.get('backgroundPicture') as File;
  const userText = formData.get('userText') as string | null;
  const hashTags = formData.get('hashTags') as string | null;
  const teamSelection = formData.get('teamSelection') as string | null;

  // Validate required fields
  if (!gameId) {
    return NextResponse.json({ error: 'gameId is required' }, { status: 400 });
  }
  if (!backgroundPicture) {
    return NextResponse.json({ error: 'backgroundPicture is required' }, { status: 400 });
  }

  // Get credentials from environment variables
  const apiKey = process.env.SCORESTREAM_API_KEY;
  const accessToken = process.env.SCORESTREAM_ACCESS_TOKEN;

  if (!accessToken) {
    console.error('SCORESTREAM_ACCESS_TOKEN not configured');
    return NextResponse.json({ error: 'Server configuration error: Access token not set' }, { status: 500 });
  }

  // Build the multipart request to ScoreStream
  // For multipart with files, wrap params in a 'request' JSON field
  // and include file fields separately

  // Build the params object
  const params: Record<string, any> = {
    accessToken,
    gameId: parseInt(gameId),
  };

  if (apiKey) {
    params.apiKey = apiKey;
  }

  // Combine userText and hashTags into a single userText field
  let combinedText = userText || '';
  if (hashTags) {
    try {
      const tagsArray = JSON.parse(hashTags);
      if (Array.isArray(tagsArray) && tagsArray.length > 0) {
        const tagsString = tagsArray.join(' ');
        if (combinedText) {
          combinedText += '\n\nTags: ' + tagsString;
        } else {
          combinedText = 'Tags: ' + tagsString;
        }
      }
    } catch {
      if (combinedText) {
        combinedText += '\n\nTags: ' + hashTags;
      } else {
        combinedText = 'Tags: ' + hashTags;
      }
    }
  }
  if (combinedText) {
    params.userText = combinedText;
  }

  if (teamSelection) {
    params.teamSelection = teamSelection;
  }

  // Create the JSON-RPC request object
  const jsonRpcRequest = {
    jsonrpc: "2.0",
    method: "games.posts.add",
    params,
    id: 1
  };

  const ssFormData = new FormData();
  ssFormData.append('request', JSON.stringify(jsonRpcRequest));
  ssFormData.append('backgroundPicture', backgroundPicture);

  console.log('Posting to ScoreStream:', {
    url: SCORESTREAM_API_URL,
    gameId,
    fileName: backgroundPicture.name,
    fileSize: backgroundPicture.size,
    userText: userText?.substring(0, 50),
    hashTags,
    teamSelection,
  });

  try {
    const response = await fetch(SCORESTREAM_API_URL, {
      method: 'POST',
      body: ssFormData,
    });

    const responseText = await response.text();
    console.log('ScoreStream response:', response.status, responseText.substring(0, 500));

    let result;
    try {
      result = JSON.parse(responseText);
    } catch {
      result = { raw: responseText };
    }

    // Check for JSON-RPC error
    if (result.error) {
      console.error('ScoreStream API error:', result.error);
      return NextResponse.json(
        {
          error: 'ScoreStream API error',
          details: result.error
        },
        { status: 400 }
      );
    }

    if (!response.ok) {
      return NextResponse.json(
        {
          error: 'ScoreStream API error',
          status: response.status,
          details: result
        },
        { status: response.status }
      );
    }

    return NextResponse.json({
      success: true,
      result: result.result || result,
    });
  } catch (fetchError) {
    console.error('Error calling ScoreStream API:', fetchError);
    return NextResponse.json(
      {
        error: 'Failed to reach ScoreStream API',
        details: fetchError instanceof Error ? fetchError.message : 'Unknown error'
      },
      { status: 502 }
    );
  }
}

async function handleJsonRequest(request: NextRequest) {
  const { method, params }: ScoreStreamRequest = await request.json();

  // Validate required fields
  if (!method) {
    return NextResponse.json(
      { error: 'Method is required' },
      { status: 400 }
    );
  }

  // Get credentials from environment variables
  const apiKey = process.env.SCORESTREAM_API_KEY;
  const accessToken = process.env.SCORESTREAM_ACCESS_TOKEN;

  // Build JSON-RPC request
  const jsonRpcRequest = {
    jsonrpc: "2.0",
    method: method,
    params: {
      ...params,
      apiKey: apiKey || params.apiKey,
      accessToken: accessToken || params.accessToken,
    },
    id: 1
  };

  console.log('Calling ScoreStream API:', SCORESTREAM_API_URL, 'method:', method);

  try {
    const response = await fetch(SCORESTREAM_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(jsonRpcRequest),
    });

    const responseText = await response.text();

    let result;
    try {
      result = JSON.parse(responseText);
    } catch {
      console.error('Failed to parse ScoreStream response:', responseText.substring(0, 200));
      return NextResponse.json(
        { error: 'Invalid response from ScoreStream API' },
        { status: 502 }
      );
    }

    // Check for JSON-RPC error
    if (result.error) {
      console.error('ScoreStream API error:', result.error);
      return NextResponse.json(
        {
          jsonrpc: "2.0",
          error: result.error
        },
        { status: 400 }
      );
    }

    console.log('ScoreStream API success for method:', method);
    return NextResponse.json(result);

  } catch (fetchError) {
    console.error('Error calling ScoreStream API:', fetchError);
    return NextResponse.json(
      {
        error: 'Failed to reach ScoreStream API',
        details: fetchError instanceof Error ? fetchError.message : 'Unknown error'
      },
      { status: 502 }
    );
  }
}
