'use client';

import { useState, useEffect, useCallback } from 'react';
import { LocalPhoto } from './LocalPhotoUploader';
import { postMultiplePhotos, PostPhotoParams, BatchPostResult, PostResult } from '@/lib/scorestream-post';

interface EditablePhoto extends LocalPhoto {
  hasChanges: boolean;
}

interface PhotoEditorProps {
  photos: LocalPhoto[];
  gameId: number;
  gameName: string;
  onPublishComplete?: (result: BatchPostResult) => void;
}

export default function PhotoEditor({ photos: initialPhotos, gameId, gameName, onPublishComplete }: PhotoEditorProps) {
  const [photos, setPhotos] = useState<EditablePhoto[]>([]);
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishProgress, setPublishProgress] = useState({ completed: 0, total: 0 });
  const [currentPublishing, setCurrentPublishing] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [publishResult, setPublishResult] = useState<BatchPostResult | null>(null);

  // Initialize photos from props
  useEffect(() => {
    if (initialPhotos && initialPhotos.length > 0) {
      const editablePhotos: EditablePhoto[] = initialPhotos.map(photo => ({
        ...photo,
        hasChanges: false,
      }));
      setPhotos(editablePhotos);
    }
  }, [initialPhotos]);

  // Handle description changes
  const handleDescriptionChange = (photoId: string, description: string) => {
    setPhotos(prev => prev.map(photo =>
      photo.id === photoId
        ? { ...photo, description, hasChanges: true }
        : photo
    ));
  };

  // Handle team selection changes
  const handleTeamSelectionChange = (photoId: string, value: string) => {
    setPhotos(prev => prev.map(photo =>
      photo.id === photoId
        ? { ...photo, teamSelection: value as EditablePhoto['teamSelection'], hasChanges: true }
        : photo
    ));
  };

  // Remove a photo
  const handleRemovePhoto = (photoId: string) => {
    setPhotos(prev => {
      const photo = prev.find(p => p.id === photoId);
      if (photo?.preview) {
        URL.revokeObjectURL(photo.preview);
      }
      return prev.filter(p => p.id !== photoId);
    });
  };

  // Publish photos to ScoreStream
  const handlePublish = async () => {
    if (photos.length === 0) {
      setMessage({ type: 'error', text: 'No photos to publish' });
      return;
    }

    setIsPublishing(true);
    setPublishProgress({ completed: 0, total: photos.length });
    setMessage(null);
    setPublishResult(null);

    // Prepare post parameters
    const postParams: PostPhotoParams[] = photos.map(photo => ({
      gameId,
      file: photo.file,
      userText: photo.description || undefined,
      type: photo.type,
      teamSelection: photo.teamSelection ? (photo.teamSelection as 'home' | 'away' | 'none') : undefined,
    }));

    try {
      const result = await postMultiplePhotos(
        postParams,
        (completed, total, currentResult) => {
          setPublishProgress({ completed, total });
          setCurrentPublishing(currentResult.fileName || null);
        }
      );

      setPublishResult(result);

      if (result.failureCount === 0) {
        setMessage({
          type: 'success',
          text: `Successfully posted ${result.successCount} photo${result.successCount > 1 ? 's' : ''} to ScoreStream!`
        });
        // Clear photos on full success
        photos.forEach(photo => {
          if (photo.preview) URL.revokeObjectURL(photo.preview);
        });
        setPhotos([]);
      } else if (result.successCount > 0) {
        setMessage({
          type: 'error',
          text: `Posted ${result.successCount} photos, but ${result.failureCount} failed. Check details below.`
        });
        // Remove successful photos, keep failed ones
        const failedFileNames = new Set(result.failed.map(f => f.fileName));
        setPhotos(prev => prev.filter(p => failedFileNames.has(p.file.name)));
      } else {
        setMessage({
          type: 'error',
          text: `Failed to post all ${result.failureCount} photos. Check details below.`
        });
      }

      onPublishComplete?.(result);
    } catch (error) {
      setMessage({
        type: 'error',
        text: 'Failed to post photos. Please try again.'
      });
    } finally {
      setIsPublishing(false);
      setCurrentPublishing(null);
    }
  };

  // Clear message after 5 seconds
  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  if (photos.length === 0 && !publishResult) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-100">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="bg-white rounded-lg p-8 shadow-sm border text-center">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">No Photos to Edit</h2>
            <p className="text-gray-600 mb-6">
              Select some photos first to start editing.
            </p>
            <button
              onClick={() => window.history.back()}
              className="px-6 py-3 bg-[#1b95e5] text-white rounded-lg hover:bg-[#1580c7] transition-colors"
            >
              Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-bold text-[#1b95e5] mb-4">
            Edit Photos
          </h1>
          <p className="text-xl text-gray-700 max-w-3xl mx-auto">
            Add descriptions and select team before posting to ScoreStream.
          </p>
          <div className="mt-4 bg-blue-50 rounded-lg p-3 inline-block">
            <p className="text-[#1b95e5] font-medium">
              Posting to: <span className="font-bold">{gameName || `Game ${gameId}`}</span>
            </p>
          </div>
        </div>

        {/* Message Display */}
        {message && (
          <div className={`mb-6 p-4 rounded-lg ${
            message.type === 'success'
              ? 'bg-green-50 border border-green-200 text-green-800'
              : 'bg-red-50 border border-red-200 text-red-800'
          }`}>
            <div className="flex items-center">
              {message.type === 'success' ? (
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              ) : (
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
              {message.text}
            </div>
          </div>
        )}

        {/* Publish Progress */}
        {isPublishing && (
          <div className="mb-8 bg-white rounded-lg p-6 shadow-sm border">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Posting to ScoreStream...
            </h3>
            <div className="mb-2 flex justify-between text-sm text-gray-600">
              <span>Progress: {publishProgress.completed} / {publishProgress.total}</span>
              <span>{Math.round((publishProgress.completed / publishProgress.total) * 100)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className="bg-[#1b95e5] h-3 rounded-full transition-all duration-300"
                style={{ width: `${(publishProgress.completed / publishProgress.total) * 100}%` }}
              />
            </div>
            {currentPublishing && (
              <p className="mt-2 text-sm text-gray-500">
                Currently posting: {currentPublishing}
              </p>
            )}
          </div>
        )}

        {/* Publish Results */}
        {publishResult && publishResult.failureCount > 0 && (
          <div className="mb-8 bg-yellow-50 rounded-lg p-6 shadow-sm border border-yellow-200">
            <h3 className="text-lg font-semibold text-yellow-800 mb-4">
              Posting Results
            </h3>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="text-center p-3 bg-green-100 rounded-lg">
                <p className="text-2xl font-bold text-green-700">{publishResult.successCount}</p>
                <p className="text-sm text-green-600">Successful</p>
              </div>
              <div className="text-center p-3 bg-red-100 rounded-lg">
                <p className="text-2xl font-bold text-red-700">{publishResult.failureCount}</p>
                <p className="text-sm text-red-600">Failed</p>
              </div>
            </div>
            {publishResult.failed.length > 0 && (
              <div>
                <p className="font-medium text-yellow-800 mb-2">Failed photos:</p>
                <ul className="text-sm text-yellow-700 space-y-1">
                  {publishResult.failed.map((f, i) => (
                    <li key={i}>
                      {f.fileName}: {f.error}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Success Message with no more photos */}
        {photos.length === 0 && publishResult && publishResult.failureCount === 0 && (
          <div className="text-center bg-white rounded-lg p-8 shadow-sm border">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">All Photos Posted!</h2>
            <p className="text-gray-600 mb-6">
              {publishResult.successCount} photo{publishResult.successCount > 1 ? 's were' : ' was'} successfully posted to the game.
            </p>
            <button
              onClick={() => window.location.href = '/'}
              className="px-6 py-3 bg-[#1b95e5] text-white rounded-lg hover:bg-[#1580c7] transition-colors"
            >
              Start New Session
            </button>
          </div>
        )}

        {/* Publish Button */}
        {photos.length > 0 && !isPublishing && (
          <div className="mb-8 flex justify-center">
            <button
              onClick={handlePublish}
              disabled={isPublishing}
              className="px-8 py-4 bg-[#1b95e5] text-white font-semibold rounded-lg hover:bg-[#1580c7] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl flex items-center"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
              Post {photos.length} Photo{photos.length > 1 ? 's' : ''} to ScoreStream
            </button>
          </div>
        )}

        {/* Photos Grid */}
        {photos.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {photos.map((photo) => (
              <div key={photo.id} className="bg-white rounded-lg shadow-sm border overflow-hidden">
                {/* Photo Display */}
                <div className="relative">
                  {photo.type === 'video' ? (
                    <video
                      src={photo.preview}
                      className="w-full h-48 object-cover"
                      muted
                      playsInline
                      controls
                    />
                  ) : (
                    <img
                      src={photo.preview}
                      alt={photo.file.name}
                      className="w-full h-48 object-cover"
                    />
                  )}
                  <button
                    onClick={() => handleRemovePhoto(photo.id)}
                    className="absolute top-2 right-2 bg-red-500 text-white p-1.5 rounded-full hover:bg-red-600 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {/* Photo Info */}
                <div className="p-4 space-y-4">
                  <div>
                    <h3 className="font-semibold text-gray-900 truncate" title={photo.file.name}>
                      {photo.file.name}
                    </h3>
                    <p className="text-sm text-gray-500">
                      {Math.round(photo.file.size / 1024)}KB
                    </p>
                  </div>

                  {/* Description Input */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Caption (userText)
                    </label>
                    <textarea
                      value={photo.description}
                      onChange={(e) => handleDescriptionChange(photo.id, e.target.value)}
                      placeholder="Add a caption..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#1b95e5] focus:border-transparent resize-none"
                      rows={2}
                    />
                  </div>

                  {/* Team Selection */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Team Selection
                    </label>
                    <select
                      value={photo.teamSelection}
                      onChange={(e) => handleTeamSelectionChange(photo.id, e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#1b95e5] focus:border-transparent"
                    >
                      <option value="">No Selection</option>
                      <option value="home">Home Team</option>
                      <option value="away">Away Team</option>
                      <option value="none">Neither</option>
                    </select>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Footer Info */}
        {photos.length > 0 && (
          <div className="mt-12 text-center text-gray-600">
            <p className="text-sm">
              {photos.length} photo{photos.length > 1 ? 's' : ''} ready to post
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
