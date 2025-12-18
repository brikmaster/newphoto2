import { NextRequest, NextResponse } from 'next/server';

interface ScoreStreamRequest {
  method: string;
  params: any;
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

    // For now, return mock data based on the example you provided
    // You'll need to replace this with actual ScoreStream API calls
    if (method === 'user.activity.cards.search') {
      // Return the example data you provided
      const mockResponse = {
        jsonrpc: "2.0",
        result: {
          cardIds: [45525971379000, 45525941347000, 45525942403000],
          collections: {
            cardCollection: {
              list: [
                {
                  cardId: 45525971379000,
                  cardType: "game",
                  cardTimestamp: "2025-12-06 04:17:26",
                  gameId: 5971379,
                  cardTitle: `{users:${params.userId}} scored a game.`
                },
                {
                  cardId: 45525941347000,
                  cardType: "game", 
                  cardTimestamp: "2025-11-30 06:28:48",
                  gameId: 5941347,
                  cardTitle: `{users:${params.userId}} scored a game 5 times.`
                },
                {
                  cardId: 45525942403000,
                  cardType: "game",
                  cardTimestamp: "2025-11-30 02:44:42", 
                  gameId: 5942403,
                  cardTitle: `{users:${params.userId}} scored a game 6 times.`
                }
              ]
            },
            gameCollection: {
              list: [
                {
                  gameId: 5971379,
                  homeTeamId: 2145,
                  awayTeamId: 241724,
                  sportName: "football",
                  startDateTime: "2025-12-06 03:30:00",
                  gameTitle: "CIF Championship Game",
                  lastScore: {
                    awayTeamScore: 42,
                    homeTeamScore: 21,
                    gameSegmentId: 19999
                  }
                },
                {
                  gameId: 5941347,
                  homeTeamId: 2122,
                  awayTeamId: 1890,
                  sportName: "football", 
                  startDateTime: "2025-11-30 03:30:00",
                  gameTitle: "CIF San Diego Section Division l Championship",
                  lastScore: {
                    awayTeamScore: 41,
                    homeTeamScore: 29,
                    gameSegmentId: 19999
                  }
                },
                {
                  gameId: 5942403,
                  homeTeamId: 1532,
                  awayTeamId: 264841,
                  sportName: "football",
                  startDateTime: "2025-11-29 23:30:00", 
                  gameTitle: null,
                  lastScore: {
                    awayTeamScore: 28,
                    homeTeamScore: 17,
                    gameSegmentId: 19999
                  }
                }
              ]
            },
            teamCollection: {
              list: [
                {
                  teamId: 241724,
                  teamName: "Cathedral Catholic High School",
                  mascot1: "Dons",
                  minTeamName: "Cathedral Catholic",
                  city: "San Diego",
                  state: "CA"
                },
                {
                  teamId: 2145,
                  teamName: "Los Alamitos High School", 
                  mascot1: "Griffins",
                  minTeamName: "Los Alamitos",
                  city: "Los Alamitos",
                  state: "CA"
                },
                {
                  teamId: 2122,
                  teamName: "Lincoln High School",
                  mascot1: "Hornets", 
                  minTeamName: "Lincoln",
                  city: "San Diego",
                  state: "CA"
                },
                {
                  teamId: 1890,
                  teamName: "Granite Hills High School",
                  mascot1: "Eagles",
                  minTeamName: "Granite Hills", 
                  city: "El Cajon",
                  state: "CA"
                },
                {
                  teamId: 1532,
                  teamName: "Central Union High School",
                  mascot1: "Spartans",
                  minTeamName: "Central Union",
                  city: "El Centro", 
                  state: "CA"
                },
                {
                  teamId: 264841,
                  teamName: "Christian High School",
                  mascot1: "Patriots",
                  minTeamName: "Christian",
                  city: "El Cajon",
                  state: "CA"
                }
              ]
            },
            userCollection: {
              list: [
                {
                  userId: parseInt(params.userId),
                  fullName: "Sample User",
                  username: `user${params.userId}`,
                  city: "San Diego",
                  state: "CA",
                  country: "US"
                }
              ]
            }
          },
          total: 3
        }
      };

      return NextResponse.json(mockResponse);
    }

    // TODO: Replace with actual ScoreStream API integration
    // For now, return a generic response
    return NextResponse.json({
      jsonrpc: "2.0",
      result: {
        message: `Method ${method} not yet implemented`
      }
    });

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