import { NextRequest } from 'next/server';
import { getAllMembers } from '@/domain/repositories/member-repository';

export async function GET(_request: NextRequest) {
  try {
    const members = await getAllMembers();
    return Response.json({ success: true, data: members }, { status: 200 });
  } catch {
    return Response.json(
      { success: false, error: { code: 'DB_ERROR', message: 'Database error' } },
      { status: 500 }
    );
  }
}
