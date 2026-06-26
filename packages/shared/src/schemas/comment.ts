import { z } from 'zod';

// Defined as a ZodLazy to break the circular reference for the optional `replies` field.
export const commentSchema: z.ZodType<Comment> = z.lazy(() =>
  z.object({
    id: z.string(),
    parentType: z.enum(['post', 'photo']),
    parentId: z.string(),
    author: z.object({
      id: z.string(),
      displayName: z.string(),
      avatarUrl: z.string().nullable(),
    }),
    body: z.string(),
    createdAt: z.string(),
    likes: z.number(),
    replies: z.array(commentSchema).optional(),
  }),
);

export interface Comment {
  id: string;
  parentType: 'post' | 'photo';
  parentId: string;
  author: { id: string; displayName: string; avatarUrl: string | null };
  body: string;
  createdAt: string;
  likes: number;
  replies?: Comment[];
}

export const commentListSchema = z.array(commentSchema);
export const postCommentRequestSchema = z.object({ body: z.string().min(1) });
