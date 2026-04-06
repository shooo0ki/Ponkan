import { NextRequest } from 'next/server';
import { deleteScreenshot, getScreenshotById } from '@/domain/repositories/screenshot-repository';

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    await deleteScreenshot(id);
    return Response.json({ success: true }, { status: 200 });
  } catch {
    return Response.json(
      { success: false, error: { code: 'DB_ERROR', message: 'Database error' } },
      { status: 500 }
    );
  }
}
