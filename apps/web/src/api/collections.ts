import { z } from 'zod';
import { collectionSchema } from '@blueflutes/shared';
import { apiFetch } from './client.js';

export function getCollections() {
  return apiFetch('/me/collections', {}, z.array(collectionSchema));
}

export function createCollection(name: string) {
  return apiFetch(
    '/me/collections',
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name }) },
    collectionSchema,
  );
}
