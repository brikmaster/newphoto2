// ScoreStream API integration for game lookup
export interface ScoreStreamGame {
  gameId: number;
  homeTeamId: number;
  awayTeamId: number;
  homeTeamName: string;
  awayTeamName: string;
  sportName: string;
  startDateTime: string;
  gameTitle?: string;
  lastScore?: {
    awayTeamScore: number;
    homeTeamScore: number;
    gameSegmentId: number;
  };
  venue?: {
    name: string;
    city: string;
    state: string;
  };
}

export interface ScoreStreamCard {
  cardId: number;
  cardType: string;
  cardTimestamp: string;
  gameId: number;
  cardTitle: string;
}

export interface ScoreStreamResponse {
  jsonrpc: string;
  result: {
    cardIds: number[];
    collections: {
      cardCollection: {
        list: ScoreStreamCard[];
      };
      gameCollection: {
        list: any[];
      };
      teamCollection: {
        list: any[];
      };
      userCollection: {
        list: any[];
      };
    };
    total: number;
  };
}

export class ScoreStreamService {
  private static readonly API_URL = process.env.NEXT_PUBLIC_SCORESTREAM_API_URL || 'https://scorestream.com/api/';
  private static readonly API_KEY = process.env.NEXT_PUBLIC_SCORESTREAM_API_KEY || '';
  private static readonly ACCESS_TOKEN = process.env.NEXT_PUBLIC_SCORESTREAM_ACCESS_TOKEN || '';
  
  /**
   * Fetch user activity cards to get games associated with a user
   */
  static async getUserGames(userId: string): Promise<ScoreStreamGame[]> {
    try {
      // Call ScoreStream API - you'll need to implement the actual API call here
      // This would be the user.activity.cards.search method
      const response = await this.callScoreStreamAPI('users.activity.cards.search', {
        userId: parseInt(userId),
        limit: 50, // Adjust as needed
        cardTypes: ['game']
      });

      if (!response.result) {
        console.error('ScoreStream: No result in response', response);
        throw new Error('Invalid ScoreStream response');
      }

      const { collections } = response.result;
      console.log('ScoreStream: Got collections', {
        hasCardCollection: !!collections?.cardCollection,
        cardCount: collections?.cardCollection?.list?.length || 0,
        hasGameCollection: !!collections?.gameCollection,
        gameCount: collections?.gameCollection?.list?.length || 0,
      });
      const games: ScoreStreamGame[] = [];
      
      // Process the collections to create game objects
      const gameCards = collections.cardCollection?.list || [];
      const gameData = collections.gameCollection?.list || [];
      const teamData = collections.teamCollection?.list || [];
      
      // Create a map of teams for quick lookup
      const teamMap = new Map();
      teamData.forEach((team: any) => {
        teamMap.set(team.teamId, team);
      });
      
      // Create a map of game details
      const gameMap = new Map();
      gameData.forEach((game: any) => {
        gameMap.set(game.gameId, game);
      });
      
      // Process game cards and combine with game details
      gameCards.forEach((card: ScoreStreamCard) => {
        if (card.cardType === 'game') {
          const gameDetails = gameMap.get(card.gameId);
          if (gameDetails) {
            const homeTeam = teamMap.get(gameDetails.homeTeamId);
            const awayTeam = teamMap.get(gameDetails.awayTeamId);
            
            games.push({
              gameId: card.gameId,
              homeTeamId: gameDetails.homeTeamId,
              awayTeamId: gameDetails.awayTeamId,
              homeTeamName: homeTeam?.teamName || `Team ${gameDetails.homeTeamId}`,
              awayTeamName: awayTeam?.teamName || `Team ${gameDetails.awayTeamId}`,
              sportName: gameDetails.sportName,
              startDateTime: gameDetails.startDateTime,
              gameTitle: gameDetails.gameTitle,
              lastScore: gameDetails.lastScore,
            });
          }
        }
      });
      
      // Sort games by date (most recent first)
      games.sort((a, b) => new Date(b.startDateTime).getTime() - new Date(a.startDateTime).getTime());

      console.log('ScoreStream: Processed games count:', games.length);
      return games;
    } catch (error) {
      console.error('Error fetching user games from ScoreStream:', error);
      throw new Error('Failed to fetch games from ScoreStream');
    }
  }

  /**
   * Get a specific game by gameId
   */
  static async getGame(gameId: string): Promise<ScoreStreamGame | null> {
    try {
      const response = await this.callScoreStreamAPI('game.get', {
        gameId: parseInt(gameId)
      });

      if (!response.result) {
        return null;
      }

      // Process the game data - you'd implement this based on the actual API response
      // This is a simplified version
      const gameData = response.result as any;

      return {
        gameId: gameData.gameId,
        homeTeamId: gameData.homeTeamId,
        awayTeamId: gameData.awayTeamId,
        homeTeamName: gameData.homeTeamName,
        awayTeamName: gameData.awayTeamName,
        sportName: gameData.sportName,
        startDateTime: gameData.startDateTime,
        gameTitle: gameData.gameTitle,
        lastScore: gameData.lastScore,
      };
    } catch (error) {
      console.error('Error fetching game from ScoreStream:', error);
      return null;
    }
  }

  /**
   * Format game display name for UI
   */
  static formatGameDisplay(game: ScoreStreamGame): string {
    const date = new Date(game.startDateTime).toLocaleDateString();
    const score = game.lastScore 
      ? `${game.awayTeamName} ${game.lastScore.awayTeamScore} - ${game.lastScore.homeTeamScore} ${game.homeTeamName}`
      : `${game.awayTeamName} vs ${game.homeTeamName}`;
    
    return `${score} (${date})`;
  }

  /**
   * Call ScoreStream API - placeholder for actual implementation
   * You'll need to implement this based on your ScoreStream API access method
   */
  private static async callScoreStreamAPI(method: string, params: any): Promise<ScoreStreamResponse> {
    const jsonRpcRequest = {
      jsonrpc: "2.0",
      method,
      params: {
        ...params,
        apiKey: this.API_KEY,
        accessToken: this.ACCESS_TOKEN,
      },
      id: 1,
    };

    const response = await fetch(this.API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(jsonRpcRequest),
    });

    if (!response.ok) {
      throw new Error(`ScoreStream API error: ${response.statusText}`);
    }

    return response.json();
  }
}