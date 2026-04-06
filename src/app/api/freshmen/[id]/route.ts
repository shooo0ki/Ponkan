import { NextRequest } from 'next/server';
import { getFreshmanById, updateFreshman } from '@/domain/repositories/freshman-repository';
import { updateFreshmanSchema } from '@/schemas/freshman';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const freshman = await getFreshmanById(id);
    if (!freshman) {
      return Response.json(
        { success: false, error: { code: 'FRESHMAN_NOT_FOUND', message: 'Freshman not found' } },
        { status: 404 }
      );
    }
    return Response.json({ success: true, data: freshman }, { status: 200 });
  } catch {
    return Response.json(
      { success: false, error: { code: 'DB_ERROR', message: 'Database error' } },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json(
      { success: false, error: { code: 'INVALID_BODY', message: 'Invalid JSON body' } },
      { status: 400 }
    );
  }

  const result = updateFreshmanSchema.safeParse(body);
  if (!result.success) {
    return Response.json(
      { success: false, error: { code: 'VALIDATION_ERROR', message: result.error.issues[0]?.message ?? 'Validation error' } },
      { status: 400 }
    );
  }

  try {
    await updateFreshman(id, result.data);
    const updated = await getFreshmanById(id);
    return Response.json({ success: true, data: updated }, { status: 200 });
  } catch {
    return Response.json(
      { success: false, error: { code: 'DB_ERROR', message: 'Database error' } },
      { status: 500 }
    );
  }
}
