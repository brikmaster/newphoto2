'use client';

import { Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import PhotoEditor from '../../components/PhotoEditor';
import Navigation from '../../components/Navigation';
import { LocalPhoto } from '../../components/LocalPhotoUploader';

function EditPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [photos, setPhotos] = useState<LocalPhoto[]>([]);
  const [gameId, setGameId] = useState<number>(0);
  const [gameName, setGameName] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load photos from window state (passed from upload page)
  useEffect(() => {
    const loadPhotos = () => {
      try {
        setIsLoading(true);
        setError(null);

        // Get game info from sessionStorage
        const storedGameId = sessionStorage.getItem('photoStream_gameId');
        const storedGameName = sessionStorage.getItem('photoStream_gameName');

        if (storedGameId) {
          setGameId(parseInt(storedGameId));
        }
        if (storedGameName) {
          setGameName(storedGameName);
        }

        // Get photos from window state (set by upload page)
        const windowPhotos = (window as any).__photoStreamPhotos as LocalPhoto[] | undefined;

        if (windowPhotos && windowPhotos.length > 0) {
          console.log('Loaded photos from window state:', windowPhotos.length);
          setPhotos(windowPhotos);
          // Clear the window state after loading
          delete (window as any).__photoStreamPhotos;
        } else {
          // No photos found
          console.log('No photos found in window state');
          setError('No photos found. Please select photos first.');
        }
      } catch (err) {
        console.error('Error loading photos:', err);
        setError('Failed to load photos. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    loadPhotos();
  }, []);

  const handlePublishComplete = (result: any) => {
    console.log('Publish complete:', result);
    // Photos cleared automatically by PhotoEditor on success
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-100">
        <Navigation />
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1b95e5]"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-100">
        <Navigation />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="bg-red-50 border border-red-200 rounded-lg p-8 text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-red-800 mb-4">Error Loading Photos</h2>
            <p className="text-red-700 mb-6">{error}</p>
            <button
              onClick={() => router.push('/upload')}
              className="px-6 py-3 bg-[#1b95e5] text-white rounded-lg hover:bg-[#1580c7] transition-colors"
            >
              Go to Upload
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!gameId) {
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
            <h2 className="text-2xl font-bold text-yellow-800 mb-4">No Game Selected</h2>
            <p className="text-yellow-700 mb-6">
              Please select a game first before editing photos.
            </p>
            <button
              onClick={() => router.push('/')}
              className="px-6 py-3 bg-[#1b95e5] text-white rounded-lg hover:bg-[#1580c7] transition-colors"
            >
              Select a Game
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-100">
      <Navigation />
      <PhotoEditor
        photos={photos}
        gameId={gameId}
        gameName={gameName}
        onPublishComplete={handlePublishComplete}
      />
    </div>
  );
}

export default function EditPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-100">
        <Navigation />
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1b95e5]"></div>
        </div>
      </div>
    }>
      <EditPageContent />
    </Suspense>
  );
}
