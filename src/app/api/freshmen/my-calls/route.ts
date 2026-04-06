import { NextRequest } from 'next/server';
import { getMyCalls } from '@/domain/repositories/freshman-repository';

export async function GET(request: NextRequest) {
  const memberId = request.headers.get('X-Member-Id');
  if (!memberId) {
    return Response.json(
      { success: false, error: { code: 'MEMBER_ID_REQUIRED', message: 'X-Member-Id header is required' } },
      { status: 400 }
    );
  }

  try {
    const calls = await getMyCalls(memberId);
    return Response.json({ success: true, data: calls }, { status: 200 });
  } catch {
    return Response.json(
      { success: false, error: { code: 'DB_ERROR', message: 'Database error' } },
      { status: 500 }
    );
  }
}
