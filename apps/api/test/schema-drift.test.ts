import {
  mediaAssetSchema,
  nodeSchema,
  tenantDomainSchema,
  tenantSchema,
  tokenSchema,
  userSchema,
} from '@portfoliohub/shared';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import {
  mediaAssetRowSchema,
  nodeRowSchema,
  tenantDomainRowSchema,
  tenantRowSchema,
  tokenRowSchema,
  userRowSchema,
} from '../src/db/zod.js';

/**
 * Guards against drift between the DB schema (Drizzle) and the API contract
 * (Zod schemas in @portfoliohub/shared): every field the contract promises
 * must exist on the corresponding table with a compatible primitive shape.
 */
function unwrap(schema: z.ZodTypeAny): z.ZodTypeAny {
  if (schema instanceof z.ZodNullable || schema instanceof z.ZodOptional) {
    return unwrap(schema.unwrap());
  }
  return schema;
}

function kindOf(schema: z.ZodTypeAny): string {
  return unwrap(schema)._def.typeName;
}

function assertFieldsMatch(
  contract: z.ZodObject<z.ZodRawShape>,
  row: z.ZodObject<z.ZodRawShape>,
  label: string,
) {
  for (const [key, contractField] of Object.entries(contract.shape)) {
    const rowField = row.shape[key];
    expect(rowField, `${label}.${key} is missing from the DB schema`).toBeDefined();
    expect(kindOf(rowField as z.ZodTypeAny), `${label}.${key} type mismatch`).toBe(
      kindOf(contractField as z.ZodTypeAny),
    );
  }
}

describe('shared Zod contracts match the Drizzle table schemas', () => {
  it('tenant', () => assertFieldsMatch(tenantSchema, tenantRowSchema, 'tenant'));
  it('tenantDomain', () =>
    assertFieldsMatch(tenantDomainSchema, tenantDomainRowSchema, 'tenantDomain'));
  it('user', () => assertFieldsMatch(userSchema, userRowSchema, 'user'));
  it('token', () => assertFieldsMatch(tokenSchema, tokenRowSchema, 'token'));
  it('node', () => assertFieldsMatch(nodeSchema, nodeRowSchema, 'node'));
  it('mediaAsset', () => assertFieldsMatch(mediaAssetSchema, mediaAssetRowSchema, 'mediaAsset'));
});
