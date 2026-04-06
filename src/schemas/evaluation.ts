import { z } from 'zod';

const scoreField = z.number().int().min(1).max(5).optional();

export const evaluationInputSchema = z.object({
  feature_text: z.string().optional(),
  score_atmosphere: scoreField,
  score_looks: scoreField,
  score_commitment: scoreField,
  score_want_in: scoreField,
  memo: z.string().optional(),
});

export type EvaluationInput = z.infer<typeof evaluationInputSchema>;
