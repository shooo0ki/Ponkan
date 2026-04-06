import { supabaseAdmin } from '@/lib/supabase';

// ---------- createAssignment ----------

/**
 * assignments テーブルに INSERT する。
 * UNIQUE 制約違反 (freshman_id, member_id) は呼び出し元でハンドリングするため、
 * エラーはそのまま throw する（API 層で 409 に変換）。
 */
export async function createAssignment(
  freshmanId: string,
  memberId: string
): Promise<{ id: string; freshman_id: string; member_id: string; created_at: string }> {
  const { data, error } = await supabaseAdmin
    .from('assignments')
    .insert({
      freshman_id: freshmanId,
      member_id: memberId,
    })
    .select('id, freshman_id, member_id, created_at')
    .single();
  if (error) throw error;
  return data as { id: string; freshman_id: string; member_id: string; created_at: string };
}
