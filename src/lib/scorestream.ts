import { getAccessToken } from './auth';

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
   * Fetch games for a user by getting their favorite teams, then each team's activity
   */
  static async getUserGames(userId: string): Promise<ScoreStreamGame[]> {
    try {
      // Step 1: Get user's favorite teams
      const teamsResponse = await this.callScoreStreamAPI('users.getFavoriteTeams', {
        userId: parseInt(userId),
      });

      const teamIds: number[] = [];
      const teamMap = new Map();

      const teamList = (teamsResponse.result as any)?.collections?.teamCollection?.list
        || (teamsResponse.result as any)?.teams
        || [];
      teamList.forEach((team: any) => {
        if (team.teamId) {
          teamIds.push(team.teamId);
          teamMap.set(team.teamId, team);
        }
      });

      if (teamIds.length === 0) {
        console.warn('ScoreStream: No favorite teams found for user', userId);
        return [];
      }

      // Step 2: Fetch activity cards for each team in parallel
      const teamResponses = await Promise.all(
        teamIds.map(teamId =>
          this.callScoreStreamAPI('teams.activity.cards.search', {
            teamId,
            count: 20,
          }).catch(() => null)
        )
      );

      // Step 3: Collect all games across teams, deduplicating by gameId
      const gameMap = new Map();
      const seen = new Set<number>();
      const games: ScoreStreamGame[] = [];

      for (const resp of teamResponses) {
        if (!resp?.result) continue;
        const { collections } = resp.result as any;

        const respTeams = collections?.teamCollection?.list || [];
        respTeams.forEach((team: any) => {
          if (!teamMap.has(team.teamId)) teamMap.set(team.teamId, team);
        });

        const gameData = collections?.gameCollection?.list || [];
        gameData.forEach((game: any) => {
          if (game.gameId && !seen.has(game.gameId)) {
            seen.add(game.gameId);
            const homeTeam = teamMap.get(game.homeTeamId);
            const awayTeam = teamMap.get(game.awayTeamId);

            games.push({
              gameId: game.gameId,
              homeTeamId: game.homeTeamId,
              awayTeamId: game.awayTeamId,
              homeTeamName: homeTeam?.teamName || homeTeam?.minTeamName || `Team ${game.homeTeamId}`,
              awayTeamName: awayTeam?.teamName || awayTeam?.minTeamName || `Team ${game.awayTeamId}`,
              sportName: game.sportName,
              startDateTime: game.startDateTime,
              gameTitle: game.gameTitle,
              lastScore: game.lastScore,
            });
          }
        });
      }

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
    // Call directly without apiKey — users.checkAccessToken only needs the accessToken
    const response = await fetch(this.API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'users.checkAccessToken',
        params: { accessToken },
        id: 1,
      }),
    });

    if (!response.ok) {
      throw new Error(`ScoreStream API error: ${response.statusText}`);
    }

    const data = await response.json();
    const result = data.result;

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
        ...(this.API_KEY ? { apiKey: this.API_KEY } : {}),
        accessToken: getAccessToken() || this.ACCESS_TOKEN,
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
