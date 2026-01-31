// Cookie helper for ScoreStream authentication

/**
 * Read the accessToken from cookies.
 * The ScoreStream cookie stores an accessToken that identifies the logged-in user.
 */
export function getAccessToken(): string | null {
  if (typeof document === 'undefined') return null;

  const cookies = document.cookie.split(';');
  for (const cookie of cookies) {
    const [name, ...rest] = cookie.trim().split('=');
    if (name === 'accessToken') {
      return decodeURIComponent(rest.join('='));
    }
  }
  return null;
}

/**
 * Returns true if an accessToken cookie is present.
 */
export function isLoggedIn(): boolean {
  return getAccessToken() !== null;
}
