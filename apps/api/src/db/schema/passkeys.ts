import { pgTable, uuid, text, bigint, boolean, timestamp, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { tenants } from './tenants.js';
import { users } from './users.js';

export const passkeyCredentials = pgTable(
  'passkey_credentials',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    // Base64url-encoded credential ID from the authenticator
    credentialId: text('credential_id').notNull(),
    // CBOR-encoded COSE public key, stored as hex string
    publicKey: text('public_key').notNull(),
    // Authenticator sign count — increments each use; 0 means counter not supported
    counter: bigint('counter', { mode: 'number' }).notNull().default(0),
    // 'singleDevice' = not synced to cloud; 'multiDevice' = may be on other devices
    deviceType: text('device_type').notNull().default('singleDevice'),
    // Whether the passkey is backed up to a cloud credential store
    backedUp: boolean('backed_up').notNull().default(false),
    // JSON array of AuthenticatorTransport values e.g. ["internal","hybrid"]
    transports: text('transports'),
    // Authenticator Attestation GUID — identifies the device model/family
    aaguid: text('aaguid'),
    // User-visible name for this device (can be edited)
    friendlyName: text('friendly_name'),
    lastUsedAt: timestamp('last_used_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('passkey_credentials_tenant_cred_id_idx').on(table.tenantId, table.credentialId),
    index('passkey_credentials_user_idx').on(table.tenantId, table.userId),
  ],
);

export const webauthnChallenges = pgTable(
  'webauthn_challenges',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
    // Base64url-encoded challenge bytes
    challenge: text('challenge').notNull(),
    type: text('type').notNull(), // 'registration' | 'authentication'
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    usedAt: timestamp('used_at', { withTimezone: true }),
    ip: text('ip'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('webauthn_challenges_tenant_user_idx').on(table.tenantId, table.userId),
    index('webauthn_challenges_expires_at_idx').on(table.expiresAt),
  ],
);
