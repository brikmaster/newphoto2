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
   * Fetch games associated with a user
   */
  static async getUserGames(userId: string): Promise<ScoreStreamGame[]> {
    try {
      // Call ScoreStream API to get user's games
      const response = await this.callScoreStreamAPI('users.games.search', {
        userId: parseInt(userId),
      });

      if (!response.result) {
        console.error('ScoreStream: No result in response', response);
        throw new Error('Invalid ScoreStream response');
      }

      const { collections, gameIds } = response.result as any;
      const games: ScoreStreamGame[] = [];

      // Get data from collections
      const gameData = collections?.gameCollection?.list || [];
      const teamData = collections?.teamCollection?.list || [];

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

      // Process each gameId
      (gameIds || []).forEach((gameId: number) => {
        const gameDetails = gameMap.get(gameId);
        if (gameDetails) {
          const homeTeam = teamMap.get(gameDetails.homeTeamId);
          const awayTeam = teamMap.get(gameDetails.awayTeamId);

          games.push({
            gameId: gameId,
            homeTeamId: gameDetails.homeTeamId,
            awayTeamId: gameDetails.awayTeamId,
            homeTeamName: homeTeam?.teamName || homeTeam?.minTeamName || `Team ${gameDetails.homeTeamId}`,
            awayTeamName: awayTeam?.teamName || awayTeam?.minTeamName || `Team ${gameDetails.awayTeamId}`,
            sportName: gameDetails.sportName,
            startDateTime: gameDetails.startDateTime,
            gameTitle: gameDetails.gameTitle,
            lastScore: gameDetails.lastScore,
          });
        }
      });

      // Sort games by date (most recent first)
      games.sort((a, b) => new Date(b.startDateTime).getTime() - new Date(a.startDateTime).getTime());

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

      // For now, this method is not fully implemented since we use getUserGames instead
      console.warn('getGame method not fully implemented - use getUserGames instead');
      return null;
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
   * Get the current user from an accessToken.
   * Tries the `users.me` method — swap the method name once the correct one is confirmed.
   */
  static async getCurrentUser(accessToken: string): Promise<{ userId: number; userName?: string }> {
    const response = await this.callScoreStreamAPI('users.checkAccessToken', { accessToken });
    const result = response.result as any;

    if (result?.userId) {
      return { userId: Number(result.userId), userName: result.userName };
    }

    throw new Error('Unable to identify user from accessToken');
  }

  /**
   * Call ScoreStream API directly via JSON-RPC
   */
  private static async callScoreStreamAPI(method: string, params: any): Promise<ScoreStreamResponse> {
    const jsonRpcRequest = {
      jsonrpc: "2.0",
      method,
      params: {
        apiKey: this.API_KEY,
        accessToken: this.ACCESS_TOKEN,
        ...params,
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
