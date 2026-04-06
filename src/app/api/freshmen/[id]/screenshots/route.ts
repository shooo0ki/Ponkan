import { NextRequest } from 'next/server';
import {
  getScreenshotsByFreshmanId,
  createScreenshot,
} from '@/domain/repositories/screenshot-repository';
import { supabaseAdmin } from '@/lib/supabase';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const screenshots = await getScreenshotsByFreshmanId(id);
    return Response.json({ success: true, data: screenshots }, { status: 200 });
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
  const { id: freshmanId } = await params;

  const memberId = request.headers.get('X-Member-Id');
  if (!memberId) {
    return Response.json(
      { success: false, error: { code: 'MEMBER_ID_REQUIRED', message: 'X-Member-Id header is required' } },
      { status: 400 }
    );
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return Response.json(
      { success: false, error: { code: 'INVALID_FILE', message: 'Invalid form data' } },
      { status: 400 }
    );
  }

  const file = formData.get('file');
  if (!file || !(file instanceof File)) {
    return Response.json(
      { success: false, error: { code: 'INVALID_FILE', message: 'File is required' } },
      { status: 400 }
    );
  }

  if (file.size > MAX_FILE_SIZE) {
    return Response.json(
      { success: false, error: { code: 'FILE_TOO_LARGE', message: 'File size must be 10MB or less' } },
      { status: 400 }
    );
  }

  if (!file.type.startsWith('image/')) {
    return Response.json(
      { success: false, error: { code: 'INVALID_FILE', message: 'Image files only' } },
      { status: 400 }
    );
  }

  // ファイル名を安全な形式に正規化（スペース・特殊文字を除去）
  const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg';
  const safeExt = ['jpg', 'jpeg', 'png', 'heic', 'heif', 'webp'].includes(ext) ? ext : 'jpg';
  const filePath = `${freshmanId}/${Date.now()}.${safeExt}`;
  const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
    .from('screenshots')
    .upload(filePath, file, { contentType: file.type });

  if (uploadError || !uploadData) {
    return Response.json(
      { success: false, error: { code: 'STORAGE_ERROR', message: 'Failed to upload file' } },
      { status: 500 }
    );
  }

  const { data: urlData } = supabaseAdmin.storage.from('screenshots').getPublicUrl(filePath);
  const imageUrl = urlData.publicUrl;

  try {
    const screenshot = await createScreenshot(freshmanId, memberId, imageUrl);
    return Response.json({ success: true, data: screenshot }, { status: 201 });
  } catch {
    return Response.json(
      { success: false, error: { code: 'DB_ERROR', message: 'Database error' } },
      { status: 500 }
    );
  }
}
