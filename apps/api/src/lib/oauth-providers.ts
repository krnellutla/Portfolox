import type { AuthProvider } from '@blueflutes/shared';
import { GitHub, Google, type OAuth2Tokens, generateCodeVerifier, generateState } from 'arctic';
import { env } from '../config/env.js';
import { AppError } from './app-error.js';

const OAUTH_SCOPES: Record<AuthProvider, string[]> = {
  google: ['openid', 'email', 'profile', 'https://www.googleapis.com/auth/photoslibrary.readonly'],
  github: ['read:user', 'user:email'],
};

export const GOOGLE_SCOPES_JOINED = OAUTH_SCOPES.google.join(' ');

function redirectURI(provider: AuthProvider): string {
  return `${env.OAUTH_REDIRECT_BASE_URL}/auth/${provider}/callback`;
}

function getGoogleProvider(): Google {
  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
    throw AppError.notFound('OAuth provider not configured');
  }
  return new Google(env.GOOGLE_CLIENT_ID, env.GOOGLE_CLIENT_SECRET, redirectURI('google'));
}

function getGitHubProvider(): GitHub {
  if (!env.GITHUB_CLIENT_ID || !env.GITHUB_CLIENT_SECRET) {
    throw AppError.notFound('OAuth provider not configured');
  }
  return new GitHub(env.GITHUB_CLIENT_ID, env.GITHUB_CLIENT_SECRET, redirectURI('github'));
}

export interface AuthorizationRequest {
  url: URL;
  state: string;
  codeVerifier?: string;
}

/**
 * Builds the provider authorization URL plus the state (and, for Google,
 * PKCE code verifier) that must round-trip via the oauth_state cookie so the
 * callback can validate them.
 */
export function createAuthorizationRequest(provider: AuthProvider): AuthorizationRequest {
  const state = generateState();

  if (provider === 'google') {
    const codeVerifier = generateCodeVerifier();
    const url = getGoogleProvider().createAuthorizationURL(state, codeVerifier, OAUTH_SCOPES.google);
    // Request offline access so Google returns a refresh token
    url.searchParams.set('access_type', 'offline');
    url.searchParams.set('prompt', 'consent');
    return { url, state, codeVerifier };
  }

  const url = getGitHubProvider().createAuthorizationURL(state, OAUTH_SCOPES.github);
  return { url, state };
}

/**
 * Exchanges an authorization code for provider tokens. `codeVerifier` is
 * required for Google (PKCE) and ignored for GitHub.
 */
export async function exchangeAuthorizationCode(
  provider: AuthProvider,
  code: string,
  codeVerifier?: string,
): Promise<OAuth2Tokens> {
  try {
    if (provider === 'google') {
      if (!codeVerifier) {
        throw AppError.unauthorized('Missing PKCE code verifier');
      }
      return await getGoogleProvider().validateAuthorizationCode(code, codeVerifier);
    }

    return await getGitHubProvider().validateAuthorizationCode(code);
  } catch (err) {
    if (err instanceof AppError) throw err;
    throw AppError.unauthorized('OAuth code exchange failed');
  }
}
