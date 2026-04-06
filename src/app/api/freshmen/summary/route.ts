import { NextRequest } from 'next/server';
import { getFreshmenSummary } from '@/domain/repositories/freshman-repository';

export async function GET(_request: NextRequest) {
  try {
    const summary = await getFreshmenSummary();
    return Response.json({ success: true, data: summary }, { status: 200 });
  } catch {
    return Response.json(
      { success: false, error: { code: 'DB_ERROR', message: 'Database error' } },
      { status: 500 }
    );
  }
}
