// ScoreStream posting types

export interface ScoreStreamPostParams {
  gameId: number;
  userText?: string;

  teamSelection?: 'home' | 'away' | 'none' | '';
  backgroundPictureSettings?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export interface ScoreStreamPostResponse {
  success: boolean;
  result?: {
    postId?: string;
    gamePostId?: string;
    message?: string;
  };
  error?: string;
}

// Local photo interface for upload/edit flow
export interface LocalPhoto {
  id: string;
  file: File;
  preview: string;
  description: string;
  type: 'photo' | 'video';
  teamSelection: 'home' | 'away' | 'none' | '';
  status: 'pending' | 'ready' | 'posting' | 'posted' | 'error';
  error?: string;
}

// Post result for batch operations
export interface PostResult {
  success: boolean;
  photoId?: string;
  postId?: string;
  fileName?: string;
  error?: string;
}

export interface BatchPostResult {
  successful: PostResult[];
  failed: PostResult[];
  totalPhotos: number;
  successCount: number;
  failureCount: number;
}

// ScoreStream game types (from existing scorestream.ts)
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

// User information
export interface User {
  id: string;
  userId: string;
  username?: string;
  displayName?: string;
  city?: string;
  state?: string;
}

// Session storage keys
export const STORAGE_KEYS = {
  USER_ID: 'photoStream_userId',
  GAME_ID: 'photoStream_gameId',
  GAME_NUMBER: 'photoStream_gameNumber',
  GAME_NAME: 'photoStream_gameName',
} as const;
