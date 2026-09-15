// EXPO_PUBLIC_* vars are inlined into the client bundle at build time — see
// .env. Not a secret: it's just the backend's base URL.
export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'https://woodshedd.com';

export function apiUrl(path: string): string {
  return `${API_URL}${path}`;
}
