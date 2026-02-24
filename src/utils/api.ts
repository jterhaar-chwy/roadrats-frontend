/**
 * Returns the API base URL dynamically based on the current browser hostname.
 * This allows the app to work from any machine (localhost, fll2fhjdev8935, etc.)
 * without hardcoding hostnames.
 *
 * - In the browser: uses window.location.hostname (e.g. "fll2fhjdev8935")
 * - During SSR/build: falls back to "localhost"
 */
export function getApiBaseUrl(): string {
  const host = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
  return `http://${host}:8080`;
}

