import { supabaseAdmin } from '@/lib/supabase';
import type { Member } from '@/domain/models/member';

export async function getAllMembers(): Promise<Member[]> {
  const { data, error } = await supabaseAdmin
    .from('members')
    .select('id, name, is_phone_staff, is_leader, created_at')
    .order('name');
  if (error) throw error;
  return data ?? [];
}
