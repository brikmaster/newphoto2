'use client';

import { useState, useEffect } from 'react';
import { ScoreStreamService, ScoreStreamGame } from '../lib/scorestream';

interface GameSelectorProps {
  userId: string;
  onGameSelect: (gameId: number, gameName: string) => void;
  selectedGameId?: number;
}

export default function GameSelector({ userId, onGameSelect, selectedGameId }: GameSelectorProps) {
  const [games, setGames] = useState<ScoreStreamGame[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const fetchGames = async (currentUserId: string) => {
    setLoading(true);
    setError(null);

    try {
      const userGames = await ScoreStreamService.getUserGames(currentUserId);
      setGames(userGames);

      if (userGames.length === 0) {
        setError('No games found for this user ID');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch games');
      setGames([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!userId || userId.trim() === '') {
      setGames([]);
      setError(null);
      return;
    }

    let cancelled = false;
    const timeoutId = setTimeout(() => {
      if (!cancelled) fetchGames(userId);
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, [userId, refreshKey]);

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
  };

  if (!userId) {
    return null;
  }

  if (loading) {
    return (
      <div className="w-full p-4 border border-gray-200 rounded-lg bg-gray-50">
        <div className="flex items-center space-x-2">
          <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
          <span className="text-sm text-gray-600">Looking up games for user {userId}...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full p-4 border border-red-200 rounded-lg bg-red-50">
        <div className="flex justify-between items-center">
          <div className="text-sm text-red-600">
            <strong>Error:</strong> {error}
          </div>
          <button onClick={handleRefresh} className="text-xs text-[#1b95e5] hover:text-[#1580c7] font-medium">
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (games.length === 0) {
    return (
      <div className="w-full p-4 border border-yellow-200 rounded-lg bg-yellow-50">
        <div className="flex justify-between items-center">
          <div className="text-sm text-yellow-700">
            No games found. Please check your account and try again.
          </div>
          <button onClick={handleRefresh} className="text-xs text-[#1b95e5] hover:text-[#1580c7] font-medium">
            Refresh
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-3">
      <div className="flex justify-between items-center">
        <div className="text-sm font-medium text-gray-700">
          Select a game:
        </div>
        <button
          onClick={handleRefresh}
          className="text-xs text-[#1b95e5] hover:text-[#1580c7] font-medium flex items-center gap-1"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh
        </button>
      </div>
      
      <div className="space-y-2 max-h-64 overflow-y-auto">
        {games.map((game) => (
          <div
            key={game.gameId}
            className={`
              p-3 border rounded-lg cursor-pointer transition-all
              ${selectedGameId === game.gameId 
                ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200' 
                : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
              }
            `}
            onClick={() => onGameSelect(game.gameId, ScoreStreamService.formatGameDisplay(game))}
          >
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="font-medium text-sm text-gray-900">
                  {game.awayTeamName} vs {game.homeTeamName}
                </div>
                
                {game.lastScore && (
                  <div className="text-sm text-gray-600 mt-1">
                    Final: {game.awayTeamName} {game.lastScore.awayTeamScore} - {game.lastScore.homeTeamScore} {game.homeTeamName}
                  </div>
                )}
                
                <div className="text-xs text-gray-500 mt-1">
                  {new Date(game.startDateTime).toLocaleDateString('en-US', {
                    weekday: 'short',
                    year: 'numeric',
                    month: 'short', 
                    day: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit'
                  })}
                </div>
                
                {game.gameTitle && (
                  <div className="text-xs text-blue-600 mt-1 font-medium">
                    {game.gameTitle}
                  </div>
                )}
              </div>
              
              <div className="ml-3 text-xs text-gray-400">
                Game #{game.gameId}
              </div>
            </div>
            
            <div className="flex items-center space-x-2 mt-2">
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 capitalize">
                {game.sportName}
              </span>
              
              {selectedGameId === game.gameId && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  Selected
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
      
      <div className="text-xs text-gray-500">
        Found {games.length} game{games.length !== 1 ? 's' : ''} for this user
      </div>
    </div>
  );
}