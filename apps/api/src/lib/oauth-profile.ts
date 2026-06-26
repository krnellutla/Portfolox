import type { AuthProvider } from '@blueflutes/shared';
import { AppError } from './app-error.js';

export interface OAuthProfile {
  email: string;
  displayName: string;
  avatarUrl: string | null;
}

interface GoogleUserInfo {
  email?: string;
  email_verified?: boolean;
  name?: string;
  picture?: string;
}

interface GitHubUser {
  login: string;
  name: string | null;
  avatar_url: string;
  email: string | null;
}

interface GitHubEmail {
  email: string;
  primary: boolean;
  verified: boolean;
}

export async function fetchOAuthProfile(provider: AuthProvider, accessToken: string): Promise<OAuthProfile> {
  return provider === 'google' ? fetchGoogleProfile(accessToken) : fetchGitHubProfile(accessToken);
}

async function fetchGoogleProfile(accessToken: string): Promise<OAuthProfile> {
  const res = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    throw AppError.unauthorized('Failed to fetch Google profile');
  }

  const profile = (await res.json()) as GoogleUserInfo;
  if (!profile.email || profile.email_verified !== true) {
    throw AppError.unauthorized('Google account has no verified email');
  }

  return {
    email: profile.email,
    displayName: profile.name ?? profile.email,
    avatarUrl: profile.picture ?? null,
  };
}

async function fetchGitHubProfile(accessToken: string): Promise<OAuthProfile> {
  const headers = { Authorization: `Bearer ${accessToken}`, 'User-Agent': 'Blueflutes' };

  const userRes = await fetch('https://api.github.com/user', { headers });
  if (!userRes.ok) {
    throw AppError.unauthorized('Failed to fetch GitHub profile');
  }
  const user = (await userRes.json()) as GitHubUser;

  let email = user.email;
  if (!email) {
    const emailsRes = await fetch('https://api.github.com/user/emails', { headers });
    if (emailsRes.ok) {
      const emails = (await emailsRes.json()) as GitHubEmail[];
      email = emails.find((e) => e.primary && e.verified)?.email ?? emails.find((e) => e.verified)?.email ?? null;
    }
  }

  if (!email) {
    throw AppError.unauthorized('GitHub account has no verified email');
  }

  return {
    email,
    displayName: user.name ?? user.login,
    avatarUrl: user.avatar_url,
  };
}
