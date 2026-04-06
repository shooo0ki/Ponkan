import { NextRequest } from 'next/server';
import {
  getEvaluationById,
  updateEvaluation,
} from '@/domain/repositories/evaluation-repository';
import { evaluationInputSchema } from '@/schemas/evaluation';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: evalId } = await params;

  const memberId = request.headers.get('X-Member-Id');
  if (!memberId) {
    return Response.json(
      { success: false, error: { code: 'MEMBER_ID_REQUIRED', message: 'X-Member-Id header is required' } },
      { status: 400 }
    );
  }

  let evaluation: Awaited<ReturnType<typeof getEvaluationById>>;
  try {
    evaluation = await getEvaluationById(evalId);
  } catch {
    return Response.json(
      { success: false, error: { code: 'DB_ERROR', message: 'Database error' } },
      { status: 500 }
    );
  }

  if (!evaluation) {
    return Response.json(
      { success: false, error: { code: 'EVALUATION_NOT_FOUND', message: 'Evaluation not found' } },
      { status: 404 }
    );
  }

  if (evaluation.member_id !== memberId) {
    return Response.json(
      { success: false, error: { code: 'FORBIDDEN_EDIT', message: 'You are not allowed to edit this evaluation' } },
      { status: 403 }
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
    await updateEvaluation(evalId, result.data);
    return Response.json({ success: true, data: null }, { status: 200 });
  } catch {
    return Response.json(
      { success: false, error: { code: 'DB_ERROR', message: 'Database error' } },
      { status: 500 }
    );
  }
}
