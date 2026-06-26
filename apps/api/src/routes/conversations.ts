import { Router } from 'express';
import { randomUUID } from 'crypto';
import { z } from 'zod';
import { asyncHandler } from '../lib/async-handler.js';
import { AppError } from '../lib/app-error.js';

export const conversationsRouter: Router = Router();

conversationsRouter.get('/conversations', asyncHandler(async (_req, res) => {
  res.json({ data: [], error: null });
}));

conversationsRouter.get('/conversations/:id/messages', asyncHandler(async (_req, res) => {
  res.json({ data: { items: [], nextCursor: null }, error: null });
}));

const sendMessageSchema = z.object({ body: z.string().min(1) });
conversationsRouter.post('/conversations/:id/messages', asyncHandler(async (req, res) => {
  if (!req.user) throw AppError.unauthorized('Not authenticated');
  const { body } = sendMessageSchema.parse(req.body);
  const { id } = req.params;
  res.status(201).json({
    data: {
      id: randomUUID(),
      conversationId: id,
      senderId: req.user.id,
      body,
      createdAt: new Date().toISOString(),
      mine: true,
    },
    error: null,
  });
}));
