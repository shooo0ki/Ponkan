import { NextRequest } from 'next/server';
import { createAssignment } from '@/domain/repositories/assignment-repository';
import { z } from 'zod';

const assignmentBodySchema = z.object({
  member_id: z.string().uuid(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: freshmanId } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json(
      { success: false, error: { code: 'INVALID_BODY', message: 'Invalid JSON body' } },
      { status: 400 }
    );
  }

  const result = assignmentBodySchema.safeParse(body);
  if (!result.success) {
    return Response.json(
      { success: false, error: { code: 'VALIDATION_ERROR', message: result.error.issues[0]?.message ?? 'Validation error' } },
      { status: 400 }
    );
  }

  try {
    const assignment = await createAssignment(freshmanId, result.data.member_id);
    return Response.json({ success: true, data: assignment }, { status: 201 });
  } catch (error) {
    const pgError = error as { code?: string };
    if (pgError?.code === '23505') {
      return Response.json(
        { success: false, error: { code: 'DUPLICATE_ASSIGNMENT', message: 'Assignment already exists' } },
        { status: 409 }
      );
    }
    return Response.json(
      { success: false, error: { code: 'DB_ERROR', message: 'Database error' } },
      { status: 500 }
    );
  }
}
