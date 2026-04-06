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

// ---------- getScreenshotById ----------

export async function getScreenshotById(id: string): Promise<Screenshot | null> {
  const { data, error } = await supabaseAdmin
    .from('line_screenshots')
    .select('id, freshman_id, uploader_id, image_url, created_at')
    .eq('id', id)
    .single();
  if (error) return null;
  return data as Screenshot;
}

// ---------- deleteScreenshot ----------

export async function deleteScreenshot(id: string): Promise<void> {
  // DB から image_url を取得してストレージからも削除
  const screenshot = await getScreenshotById(id);
  if (screenshot) {
    // image_url からストレージパスを抽出
    const url = new URL(screenshot.image_url);
    const pathMatch = url.pathname.match(/\/storage\/v1\/object\/public\/screenshots\/(.+)$/);
    if (pathMatch) {
      await supabaseAdmin.storage.from('screenshots').remove([pathMatch[1]]);
    }
  }
  const { error } = await supabaseAdmin.from('line_screenshots').delete().eq('id', id);
  if (error) throw error;
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
