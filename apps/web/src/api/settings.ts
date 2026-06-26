import { themeTokensSchema, updateTenantSettingsRequestSchema } from '@blueflutes/shared';
import type { ThemeTokens, UpdateTenantSettingsRequest } from '@blueflutes/shared';
import { apiFetch } from './client.js';

export function getPublicTheme(): Promise<ThemeTokens> {
  return apiFetch('/theme', {}, themeTokensSchema);
}

export function getMySettings(): Promise<ThemeTokens> {
  return apiFetch('/me/settings', {}, themeTokensSchema);
}

export function updateTheme(patch: UpdateTenantSettingsRequest): Promise<ThemeTokens> {
  const body = updateTenantSettingsRequestSchema.parse(patch);
  return apiFetch(
    '/me/settings/theme',
    { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) },
    themeTokensSchema,
  );
}
