// ScoreStream photo posting service
import { getAccessToken } from './auth';

const SCORESTREAM_API_URL = process.env.NEXT_PUBLIC_SCORESTREAM_API_URL || 'https://scorestream.com/api/';
const SCORESTREAM_API_KEY = process.env.NEXT_PUBLIC_SCORESTREAM_API_KEY || '';
const SCORESTREAM_ACCESS_TOKEN = process.env.NEXT_PUBLIC_SCORESTREAM_ACCESS_TOKEN || '';

const MAX_FILE_SIZE = 4 * 1024 * 1024;
const MAX_DIMENSION = 2500;
const JPEG_QUALITY = 0.90;

/**
 * Compress an image file if it exceeds the size limit
 */
async function compressIfNeeded(file: File): Promise<File> {
  if (file.size <= MAX_FILE_SIZE) {
    console.log(`File ${file.name} is ${(file.size / 1024 / 1024).toFixed(2)}MB - under 4MB limit`);
    return file;
  }

  console.log(`File ${file.name} is ${(file.size / 1024 / 1024).toFixed(2)}MB - compressing to fit under 4MB...`);

  return new Promise((resolve, reject) => {
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    img.onload = () => {
      let { width, height } = img;

      // Only resize if larger than max dimension
      if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
        if (width > height) {
          height = (height / width) * MAX_DIMENSION;
          width = MAX_DIMENSION;
        } else {
          width = (width / height) * MAX_DIMENSION;
          height = MAX_DIMENSION;
        }
      }

      canvas.width = width;
      canvas.height = height;
      ctx?.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (blob) {
            const compressedFile = new File([blob], file.name, {
              type: 'image/jpeg',
              lastModified: Date.now(),
            });
            console.log(`Compressed ${file.name}: ${(file.size / 1024 / 1024).toFixed(2)}MB -> ${(compressedFile.size / 1024 / 1024).toFixed(2)}MB`);
            resolve(compressedFile);
          } else {
            reject(new Error('Failed to compress image'));
          }
        },
        'image/jpeg',
        JPEG_QUALITY
      );
    };

    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = URL.createObjectURL(file);
  });
}

export interface PostPhotoParams {
  gameId: number;
  file: File;
  userText?: string;
  type?: 'photo' | 'video';
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
    const isVideo = params.type === 'video';
    const fileToUpload = isVideo ? params.file : await compressIfNeeded(params.file);

    // Build params for the JSON-RPC request
    const rpcParams: Record<string, any> = {
      accessToken: getAccessToken() || SCORESTREAM_ACCESS_TOKEN,
      gameId: params.gameId,
    };

    if (SCORESTREAM_API_KEY) {
      rpcParams.apiKey = SCORESTREAM_API_KEY;
    }

    if (params.userText) {
      rpcParams.userText = params.userText;
    }
    if (params.teamSelection) {
      rpcParams.teamSelection = params.teamSelection;
    }

    const jsonRpcRequest = {
      jsonrpc: "2.0",
      method: "games.posts.add",
      params: rpcParams,
      id: 1,
    };

    const formData = new FormData();
    formData.append('request', JSON.stringify(jsonRpcRequest));
    if (isVideo) {
      formData.append('video', fileToUpload);
    } else {
      formData.append('backgroundPicture', fileToUpload);
    }

    const response = await fetch(SCORESTREAM_API_URL, {
      method: 'POST',
      body: formData,
    });

    const responseText = await response.text();
    let data;
    try {
      data = JSON.parse(responseText);
    } catch {
      data = { error: 'Invalid response from ScoreStream API' };
    }

    // Check for errors: top-level error, HTTP failure, or paramErrors in result
    if (!response.ok || data.error || data.result?.paramErrors?.length > 0) {
      const errorMsg = data.result?.paramErrors?.[0]?.message
        || data.error?.message
        || data.error
        || `HTTP ${response.status}`;
      return {
        success: false,
        fileName: params.file.name,
        error: errorMsg,
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
