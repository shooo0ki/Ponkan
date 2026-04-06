import { NextRequest } from 'next/server';
import {
  getEvaluationsByFreshmanId,
  upsertEvaluation,
} from '@/domain/repositories/evaluation-repository';
import { evaluationInputSchema } from '@/schemas/evaluation';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const evaluations = await getEvaluationsByFreshmanId(id);
    return Response.json({ success: true, data: evaluations }, { status: 200 });
  } catch {
    return Response.json(
      { success: false, error: { code: 'DB_ERROR', message: 'Database error' } },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const memberId = request.headers.get('X-Member-Id');
  if (!memberId) {
    return Response.json(
      { success: false, error: { code: 'MEMBER_ID_REQUIRED', message: 'X-Member-Id header is required' } },
      { status: 400 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json(
      { success: false, error: { code: 'INVALID_BODY', message: 'Invalid JSON body' } },
      { status: 400 }
    );
  }

  const result = evaluationInputSchema.safeParse(body);
  if (!result.success) {
    const issue = result.error.issues[0];
    const isScoreError =
      issue?.path.some((p) =>
        ['score_atmosphere', 'score_looks', 'score_commitment', 'score_want_in'].includes(String(p))
      ) &&
      (issue?.code === 'too_small' || issue?.code === 'too_big');

    if (isScoreError) {
      return Response.json(
        { success: false, error: { code: 'INVALID_SCORE', message: 'Score must be between 1 and 5' } },
        { status: 400 }
      );
    }

    return Response.json(
      { success: false, error: { code: 'VALIDATION_ERROR', message: issue?.message ?? 'Validation error' } },
      { status: 400 }
    );
  }

  try {
    const evaluation = await upsertEvaluation(id, memberId, result.data);
    return Response.json({ success: true, data: evaluation }, { status: 201 });
  } catch {
    return Response.json(
      { success: false, error: { code: 'DB_ERROR', message: 'Database error' } },
      { status: 500 }
    );
  }
}
