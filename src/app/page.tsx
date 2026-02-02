'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navigation from '@/components/Navigation';
import GameSelector from '@/components/GameSelector';
import { getAccessToken } from '@/lib/auth';
import { ScoreStreamService } from '@/lib/scorestream';

type AuthState =
  | { status: 'loading' }
  | { status: 'not_logged_in' }
  | { status: 'logging_in' }
  | { status: 'resolving_user' }
  | { status: 'authenticated'; userId: string; userName?: string }
  | { status: 'error'; message: string };

export default function Home() {
  const router = useRouter();
  const [authState, setAuthState] = useState<AuthState>({ status: 'loading' });
  const [selectedGameId, setSelectedGameId] = useState<number | null>(null);
  const [selectedGameName, setSelectedGameName] = useState<string>('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const resolveUser = async () => {
    const token = getAccessToken();
    if (!token) {
      setAuthState({ status: 'not_logged_in' });
      return;
    }

    setAuthState({ status: 'resolving_user' });
    try {
      const user = await ScoreStreamService.getCurrentUser(token);
      const userId = user.userId.toString();

      // Restore previously selected game if userId matches
      const savedUserId = sessionStorage.getItem('photoStream_userId');
      if (savedUserId === userId) {
        const savedGameId = sessionStorage.getItem('photoStream_gameId');
        const savedGameName = sessionStorage.getItem('photoStream_gameName');
        if (savedGameId && savedGameName) {
          setSelectedGameId(parseInt(savedGameId));
          setSelectedGameName(savedGameName);
        }
      }

      setAuthState({ status: 'authenticated', userId, userName: user.userName });
    } catch {
      setAuthState({ status: 'error', message: 'Could not identify your account. Please try logging in again.' });
    }
  };

  // On mount: check cookie and resolve user
  useEffect(() => {
    resolveUser();
  }, []);

  const handleGameSelect = (gameId: number, gameName: string) => {
    setSelectedGameId(gameId);
    setSelectedGameName(gameName);
    if (errors.game) {
      setErrors(prev => ({ ...prev, game: '' }));
    }
  };

  const handleRetry = () => {
    setAuthState({ status: 'loading' });
    resolveUser();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (authState.status !== 'authenticated') return;

    if (!selectedGameId) {
      setErrors({ game: 'Please select a game from the list' });
      return;
    }

    setIsSubmitting(true);

    try {
      sessionStorage.setItem('photoStream_userId', authState.userId);
      sessionStorage.setItem('photoStream_gameNumber', selectedGameId.toString());
      sessionStorage.setItem('photoStream_gameId', selectedGameId.toString());
      sessionStorage.setItem('photoStream_gameName', selectedGameName);

      router.push(`/upload?userId=${encodeURIComponent(authState.userId)}&gameNumber=${encodeURIComponent(selectedGameId.toString())}`);
    } catch (error) {
      console.error('Navigation error:', error);
      setIsSubmitting(false);
    }
  };

  // --- Render helpers ---

  const renderAuthContent = () => {
    switch (authState.status) {
      case 'loading':
      case 'resolving_user':
        return (
          <div className="text-center py-12">
            <svg className="animate-spin h-10 w-10 text-[#1b95e5] mx-auto mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <p className="text-gray-600">Checking your ScoreStream login...</p>
          </div>
        );

      case 'not_logged_in':
        return (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-800 mb-2">Please Log In to ScoreStream</h3>
            <p className="text-gray-600 mb-6">
              You need to be logged in to ScoreStream to upload photos.
            </p>
            <button
              onClick={() => setAuthState({ status: 'logging_in' })}
              className="inline-block bg-[#1b95e5] text-white py-3 px-8 rounded-lg text-lg font-semibold hover:bg-[#1580c7] transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              Log in to ScoreStream
            </button>
          </div>
        );

      case 'logging_in':
        return (
          <div className="py-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-800">Log in to ScoreStream</h3>
              <button
                onClick={() => setAuthState({ status: 'not_logged_in' })}
                className="text-gray-500 hover:text-gray-700 text-sm"
              >
                Cancel
              </button>
            </div>
            <div className="border border-gray-200 rounded-lg overflow-hidden" style={{ height: '500px' }}>
              <iframe
                src="https://scorestream.com/loginPage"
                className="w-full h-full"
                title="ScoreStream Login"
              />
            </div>
            <p className="text-sm text-gray-500 mt-3 text-center">
              After logging in, click the button below.
            </p>
            <button
              onClick={() => {
                setAuthState({ status: 'loading' });
                resolveUser();
              }}
              className="mt-3 w-full bg-[#1b95e5] text-white py-3 px-6 rounded-lg font-semibold hover:bg-[#1580c7] transition-all duration-200"
            >
              I&apos;ve logged in — continue
            </button>
          </div>
        );

      case 'error':
        return (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-800 mb-2">Authentication Error</h3>
            <p className="text-gray-600 mb-6">{authState.message}</p>
            <div className="flex justify-center gap-4">
              <button
                onClick={handleRetry}
                className="bg-[#1b95e5] text-white py-3 px-8 rounded-lg font-semibold hover:bg-[#1580c7] transition-all duration-200"
              >
                Retry
              </button>
              <button
                onClick={() => setAuthState({ status: 'logging_in' })}
                className="bg-gray-200 text-gray-800 py-3 px-8 rounded-lg font-semibold hover:bg-gray-300 transition-all duration-200"
              >
                Log in again
              </button>
            </div>
          </div>
        );

      case 'authenticated':
        return (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Logged-in user badge */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center">
              <svg className="w-5 h-5 text-[#1b95e5] mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-sm text-blue-800">
                Logged in{authState.userName ? ` as ${authState.userName}` : ''} (ID: {authState.userId})
              </span>
            </div>

            {/* Game Selection */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Select Game *
              </label>
              <GameSelector
                userId={authState.userId}
                onGameSelect={handleGameSelect}
                selectedGameId={selectedGameId || undefined}
              />
              {errors.game && (
                <p className="mt-2 text-sm text-red-600 flex items-center">
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {errors.game}
                </p>
              )}
            </div>

            {/* Selected Game Display */}
            {selectedGameId && selectedGameName && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center">
                  <svg className="w-5 h-5 text-green-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <div className="text-sm font-medium text-green-800">Selected Game:</div>
                    <div className="text-sm text-green-700">{selectedGameName}</div>
                    <div className="text-xs text-green-600">Game ID: {selectedGameId}</div>
                  </div>
                </div>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-[#1b95e5] text-white py-4 px-6 rounded-lg text-lg font-semibold hover:bg-[#1580c7] focus:outline-none focus:ring-2 focus:ring-[#1b95e5] focus:ring-offset-2 transition-all duration-200 transform hover:scale-[1.02] shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              {isSubmitting ? (
                <div className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Processing...
                </div>
              ) : (
                <div className="flex items-center justify-center">
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  Bulk Photo Upload
                </div>
              )}
            </button>
          </form>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-100">
      <Navigation />

      {/* Hero Section */}
      <div className="relative overflow-hidden pt-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center mb-16">
            <h1 className="text-4xl md:text-6xl font-bold text-[#1b95e5] mb-6">
              PhotoStream
            </h1>
            <p className="text-xl text-gray-700 mb-8 max-w-2xl mx-auto">
              Professional photo management for sports teams and events.
              Upload, organize, and share your game photos with ease.
            </p>
          </div>

          {/* Main Form Card */}
          <div className="bg-white rounded-2xl shadow-2xl p-8 md:p-12 border border-gray-100">
            <div className="text-center mb-8">
              <div className="w-20 h-20 bg-[#1b95e5] rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              </div>
              <h2 className="text-2xl md:text-3xl font-bold text-[#1b95e5] mb-2">
                Start Your Photo Session
              </h2>
              <p className="text-gray-600">
                {authState.status === 'authenticated'
                  ? 'Select a game to begin uploading photos'
                  : 'Log in to ScoreStream to begin uploading photos'}
              </p>
            </div>

            {renderAuthContent()}

            {/* Info Section */}
            <div className="mt-8 pt-6 border-t border-gray-200">
              <div className="grid md:grid-cols-3 gap-4 text-center text-sm text-gray-600">
                <div className="flex flex-col items-center">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mb-2">
                    <svg className="w-4 h-4 text-[#1b95e5]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <span className="font-medium">Secure Upload</span>
                </div>
                <div className="flex flex-col items-center">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mb-2">
                    <svg className="w-4 h-4 text-[#1b95e5]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <span className="font-medium">Organized Gallery</span>
                </div>
                <div className="flex flex-col items-center">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mb-2">
                    <svg className="w-4 h-4 text-[#1b95e5]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
                    </svg>
                  </div>
                  <span className="font-medium">Easy Sharing</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-[#1b95e5] mb-4">
              Professional Photo Management
            </h2>
            <p className="text-xl text-gray-600">
              Built for sports teams, events, and professional photographers
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="bg-white rounded-xl shadow-lg p-8 border border-gray-100 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
              <div className="w-16 h-16 bg-[#1b95e5] rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-[#1b95e5] mb-3 text-center">Quick Upload</h3>
              <p className="text-gray-600 text-center">Select up to 10 photos at once and post them directly to your ScoreStream game.</p>
            </div>

            {/* Feature 2 */}
            <div className="bg-white rounded-xl shadow-lg p-8 border border-gray-100 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
              <div className="w-16 h-16 bg-[#1b95e5] rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a2 2 0 110-4h1a1 1 0 001-1V7a1 1 0 011-1h3a1 1 0 001-1V4z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-[#1b95e5] mb-3 text-center">Auto Organization</h3>
              <p className="text-gray-600 text-center">Photos are automatically organized by user and game for easy management.</p>
            </div>

            {/* Feature 3 */}
            <div className="bg-white rounded-xl shadow-lg p-8 border border-gray-100 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
              <div className="w-16 h-16 bg-[#1b95e5] rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-[#1b95e5] mb-3 text-center">ScoreStream Direct</h3>
              <p className="text-gray-600 text-center">Post photos directly to ScoreStream games with captions and team selection.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-[#1b95e5] text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-blue-100">
            Built with Next.js • Post photos directly to ScoreStream games
          </p>
        </div>
      </footer>
    </div>
  );
}
