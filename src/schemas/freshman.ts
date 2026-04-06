import { z } from 'zod';

export const APO_LABELS = ['アポ獲得', '後日電話', '後日カフェ', '音信不通'] as const;
export const APO_TIMES = ['20:00', '20:30', '21:00', '21:30', '22:00', '22:30', '23:00'] as const;

// POST /api/freshmen
export const createFreshmanSchema = z.object({
  name: z.string().min(1, 'NAME_REQUIRED'),
  department: z.string().optional(),
  alldc_flag: z.boolean().optional().default(false),
  assignee_ids: z.array(z.string().uuid()).min(1, 'ASSIGNEE_REQUIRED'),
  friend_ids: z.array(z.string().uuid()).optional().default([]),
  evaluation: z
    .object({
      feature_text: z.string().optional(),
      score_atmosphere: z.number().int().min(1).max(5).optional(),
      score_looks: z.number().int().min(1).max(5).optional(),
      score_commitment: z.number().int().min(1).max(5).optional(),
      score_want_in: z.number().int().min(1).max(5).optional(),
      memo: z.string().optional(),
    })
    .optional(),
});

// PATCH /api/freshmen/[id]
export const updateFreshmanSchema = z.object({
  status_line_done: z.boolean().optional(),
  apo_label: z.enum(APO_LABELS).nullable().optional(),
  apo_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable()
    .optional(),
  apo_time: z.enum(APO_TIMES).nullable().optional(),
  ketsu_done: z.boolean().optional(),
  alldc_flag: z.boolean().optional(),
});

// GET /api/freshmen query params
export const freshmenQuerySchema = z.object({
  status: z.enum(['line_waiting', 'apo_done', 'ketsu_done', 'alldc']).optional(),
  member_id: z.string().uuid().optional(),
  sort: z.enum(['created_at_desc', 'want_in_desc']).optional().default('created_at_desc'),
});

export type CreateFreshmanInput = z.infer<typeof createFreshmanSchema>;
export type UpdateFreshmanInput = z.infer<typeof updateFreshmanSchema>;
export type FreshmenQuery = z.infer<typeof freshmenQuerySchema>;
