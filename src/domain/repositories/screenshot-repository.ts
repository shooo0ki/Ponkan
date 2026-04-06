import { supabaseAdmin } from '@/lib/supabase';
import type { Screenshot, ScreenshotWithUploader } from '@/domain/models/screenshot';

// ---------- Row 型 ----------

type ScreenshotWithUploaderRow = {
  id: string;
  freshman_id: string;
  image_url: string;
  created_at: string;
  members: { id: string; name: string } | null;
};

// ---------- getScreenshotsByFreshmanId ----------

export async function getScreenshotsByFreshmanId(
  freshmanId: string
): Promise<ScreenshotWithUploader[]> {
  const { data, error } = await supabaseAdmin
    .from('line_screenshots')
    .select('id, freshman_id, image_url, created_at, members!uploader_id(id, name)')
    .eq('freshman_id', freshmanId)
    .order('created_at', { ascending: false });
  if (error) throw error;

  return ((data ?? []) as unknown as ScreenshotWithUploaderRow[]).map((row) => ({
    id: row.id,
    freshman_id: row.freshman_id,
    image_url: row.image_url,
    created_at: row.created_at,
    uploader: row.members ?? { id: '', name: '' },
  }));
}

// ---------- createScreenshot ----------

export async function createScreenshot(
  freshmanId: string,
  uploaderId: string,
  imageUrl: string
): Promise<Screenshot> {
  const { data, error } = await supabaseAdmin
    .from('line_screenshots')
    .insert({
      freshman_id: freshmanId,
      uploader_id: uploaderId,
      image_url: imageUrl,
    })
    .select('id, freshman_id, uploader_id, image_url, created_at')
    .single();
  if (error) throw error;
  return data as Screenshot;
}
