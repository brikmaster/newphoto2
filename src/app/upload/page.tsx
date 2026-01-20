'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import LocalPhotoUploader, { LocalPhoto } from '../../components/LocalPhotoUploader';
import PhotoEditor from '../../components/PhotoEditor';
import Navigation from '../../components/Navigation';

function UploadPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [userId, setUserId] = useState<string>('');
  const [gameId, setGameId] = useState<number>(0);
  const [gameName, setGameName] = useState<string>('');
  const [photos, setPhotos] = useState<LocalPhoto[]>([]);
  const [step, setStep] = useState<'upload' | 'edit'>('upload');

  // Read userId and gameId from URL params or sessionStorage
  useEffect(() => {
    const urlUserId = searchParams.get('userId');
    const urlGameNumber = searchParams.get('gameNumber');

    const sessionUserId = sessionStorage.getItem('photoStream_userId');
    const sessionGameId = sessionStorage.getItem('photoStream_gameId');
    const sessionGameName = sessionStorage.getItem('photoStream_gameName');

    const finalUserId = urlUserId || sessionUserId || '';
    const finalGameId = urlGameNumber ? parseInt(urlGameNumber) : (sessionGameId ? parseInt(sessionGameId) : 0);
    const finalGameName = sessionGameName || '';

    setUserId(finalUserId);
    setGameId(finalGameId);
    setGameName(finalGameName);

    // Store in sessionStorage if not already there
    if (finalUserId && !sessionUserId) {
      sessionStorage.setItem('photoStream_userId', finalUserId);
    }
    if (finalGameId && !sessionGameId) {
      sessionStorage.setItem('photoStream_gameId', finalGameId.toString());
    }
  }, [searchParams]);

  const handlePhotosReady = (selectedPhotos: LocalPhoto[]) => {
    setPhotos(selectedPhotos);
    setStep('edit');
  };

  const handleBackToUpload = () => {
    setStep('upload');
  };

  const handlePublishComplete = () => {
    // Clear photos and go back to home
    setPhotos([]);
    setStep('upload');
  };

  // Redirect to home if no userId or gameId
  if (!userId || !gameId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-100">
        <Navigation />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-8 text-center">
            <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-yellow-800 mb-4">Missing Information</h2>
            <p className="text-yellow-700 mb-6">
              User ID and Game selection are required to upload photos. Please return to the home page to select a game.
            </p>
            <button
              onClick={() => router.push('/')}
              className="px-6 py-3 bg-[#1b95e5] text-white rounded-lg hover:bg-[#1580c7] transition-colors"
            >
              Return to Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Show PhotoEditor when photos are ready
  if (step === 'edit' && photos.length > 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-100">
        <Navigation />
        <div className="max-w-7xl mx-auto px-4 py-4">
          <button
            onClick={handleBackToUpload}
            className="flex items-center text-gray-600 hover:text-gray-800 mb-4"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Photo Selection
          </button>
        </div>
        <PhotoEditor
          photos={photos}
          gameId={gameId}
          gameName={gameName}
          onPublishComplete={handlePublishComplete}
        />
      </div>
    );
  }

  // Show photo uploader
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-100">
      <Navigation />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header Section */}
        <div className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-bold text-[#1b95e5] mb-4">
            Select Your Photos
          </h1>
          <p className="text-xl text-gray-700 max-w-3xl mx-auto">
            Drag and drop your photos or click to browse. Select up to 10 photos to post to ScoreStream.
          </p>
        </div>

        {/* Session Info */}
        <div className="bg-white rounded-lg p-6 shadow-sm border mb-8">
          <div className="flex flex-col md:flex-row items-center justify-between">
            <div className="text-center md:text-left mb-4 md:mb-0">
              <h2 className="text-lg font-semibold text-[#1b95e5] mb-2">Upload Session</h2>
              <p className="text-gray-600">
                User: {userId} | Game: {gameName || `Game ${gameId}`}
              </p>
            </div>
            <div className="bg-blue-50 px-4 py-2 rounded-lg">
              <p className="text-sm text-[#1b95e5] font-medium">
                Posting directly to ScoreStream
              </p>
            </div>
          </div>
        </div>

        {/* Local Photo Uploader Component */}
        <LocalPhotoUploader
          userId={userId}
          gameId={gameId}
          gameName={gameName}
          onPhotosReady={handlePhotosReady}
          maxPhotos={10}
        />
      </div>
    </div>
  );
}

export default function UploadPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-100">
        <Navigation />
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1b95e5]"></div>
        </div>
      </div>
    }>
      <UploadPageContent />
    </Suspense>
  );
}
