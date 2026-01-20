// ScoreStream photo posting service

export interface PostPhotoParams {
  gameId: number;
  file: File;
  userText?: string;
  hashTags?: string[];
  teamSelection?: 'home' | 'away' | 'none';
}

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

/**
 * Post a single photo to ScoreStream via the games.posts.add API
 */
export async function postPhotoToScoreStream(params: PostPhotoParams): Promise<PostResult> {
  try {
    const formData = new FormData();
    formData.append('method', 'games.posts.add');
    formData.append('gameId', params.gameId.toString());
    formData.append('backgroundPicture', params.file);

    if (params.userText) {
      formData.append('userText', params.userText);
    }
    if (params.hashTags && params.hashTags.length > 0) {
      formData.append('hashTags', JSON.stringify(params.hashTags));
    }
    if (params.teamSelection) {
      formData.append('teamSelection', params.teamSelection);
    }

    const response = await fetch('/api/scorestream-proxy', {
      method: 'POST',
      body: formData,
    });

    const data = await response.json();

    if (!response.ok || data.error) {
      return {
        success: false,
        fileName: params.file.name,
        error: data.error || data.details?.message || `HTTP ${response.status}`,
      };
    }

    return {
      success: true,
      fileName: params.file.name,
      postId: data.result?.postId || data.result?.gamePostId,
    };
  } catch (error) {
    return {
      success: false,
      fileName: params.file.name,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Post multiple photos to ScoreStream sequentially with progress tracking
 */
export async function postMultiplePhotos(
  photos: PostPhotoParams[],
  onProgress?: (completed: number, total: number, currentResult: PostResult) => void
): Promise<BatchPostResult> {
  const successful: PostResult[] = [];
  const failed: PostResult[] = [];

  for (let i = 0; i < photos.length; i++) {
    const result = await postPhotoToScoreStream(photos[i]);

    if (result.success) {
      successful.push(result);
    } else {
      failed.push(result);
    }

    // Report progress
    onProgress?.(i + 1, photos.length, result);

    // Small delay between posts to avoid rate limiting
    if (i < photos.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  return {
    successful,
    failed,
    totalPhotos: photos.length,
    successCount: successful.length,
    failureCount: failed.length,
  };
}

/**
 * Retry posting failed photos
 */
export async function retryFailedPhotos(
  failedResults: PostResult[],
  originalPhotos: PostPhotoParams[],
  onProgress?: (completed: number, total: number, currentResult: PostResult) => void
): Promise<BatchPostResult> {
  // Find the original photo params for failed photos
  const photosToRetry = failedResults
    .map(failed => originalPhotos.find(p => p.file.name === failed.fileName))
    .filter((p): p is PostPhotoParams => p !== undefined);

  return postMultiplePhotos(photosToRetry, onProgress);
}
