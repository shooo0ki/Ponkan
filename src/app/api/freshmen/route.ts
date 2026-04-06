import { NextRequest } from 'next/server';
import { getFreshmenList, createFreshman } from '@/domain/repositories/freshman-repository';
import { createAssignment } from '@/domain/repositories/assignment-repository';
import { upsertEvaluation } from '@/domain/repositories/evaluation-repository';
import { freshmenQuerySchema, createFreshmanSchema } from '@/schemas/freshman';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const rawParams = {
    status: searchParams.get('status') ?? undefined,
    member_id: searchParams.get('member_id') ?? undefined,
    sort: searchParams.get('sort') ?? undefined,
  };

  const result = freshmenQuerySchema.safeParse(rawParams);
  if (!result.success) {
    return Response.json(
      { success: false, error: { code: 'INVALID_STATUS_FILTER', message: 'Invalid query parameters' } },
      { status: 400 }
    );
  }

  try {
    const freshmen = await getFreshmenList(result.data);
    return Response.json({ success: true, data: freshmen }, { status: 200 });
  } catch {
    return Response.json(
      { success: false, error: { code: 'DB_ERROR', message: 'Database error' } },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
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

  const result = createFreshmanSchema.safeParse(body);
  if (!result.success) {
    return Response.json(
      { success: false, error: { code: 'VALIDATION_ERROR', message: result.error.issues[0]?.message ?? 'Validation error' } },
      { status: 400 }
    );
  }

  const { name, department, alldc_flag, assignee_ids, friend_ids, evaluation } = result.data;

  try {
    const freshmanId = await createFreshman({
      name,
      department: department ?? null,
      alldc_flag,
      created_by: memberId,
    });

    // アサインメント作成
    await Promise.all(
      assignee_ids.map((assigneeId) => createAssignment(freshmanId, assigneeId))
    );

    // 友達関係作成
    if (friend_ids && friend_ids.length > 0) {
      const friendshipRows = friend_ids.map((friendId) => ({
        freshman_id_1: freshmanId < friendId ? freshmanId : friendId,
        freshman_id_2: freshmanId < friendId ? friendId : freshmanId,
      }));
      const { error: friendshipError } = await supabaseAdmin
        .from('friendships')
        .insert(friendshipRows);
      if (friendshipError) throw friendshipError;
    }

    // 評価作成（オプション）
    if (evaluation) {
      await upsertEvaluation(freshmanId, memberId, evaluation);
    }

    return Response.json({ success: true, data: { id: freshmanId } }, { status: 201 });
  } catch (error) {
    const pgError = error as { code?: string };
    if (pgError?.code === '23505') {
      return Response.json(
        { success: false, error: { code: 'DUPLICATE_FRESHMAN', message: 'Freshman already exists' } },
        { status: 409 }
      );
    }
    return Response.json(
      { success: false, error: { code: 'DB_ERROR', message: 'Database error' } },
      { status: 500 }
    );
  }
}
