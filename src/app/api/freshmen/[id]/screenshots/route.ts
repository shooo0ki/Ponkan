import { NextRequest } from 'next/server';
import {
  getScreenshotsByFreshmanId,
  createScreenshot,
} from '@/domain/repositories/screenshot-repository';
import { supabaseAdmin } from '@/lib/supabase';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_CONTENT_TYPES = ['image/jpeg', 'image/png'];

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

  if (!ALLOWED_CONTENT_TYPES.includes(file.type)) {
    return Response.json(
      { success: false, error: { code: 'INVALID_FILE', message: 'Only JPEG and PNG files are allowed' } },
      { status: 400 }
    );
  }

  const filePath = `${freshmanId}/${Date.now()}-${file.name}`;
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
