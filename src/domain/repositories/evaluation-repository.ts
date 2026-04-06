import { supabaseAdmin } from '@/lib/supabase';
import type { Evaluation, EvaluationWithMember } from '@/domain/models/evaluation';

// ---------- 型定義 ----------

export type UpsertEvaluationData = Partial<
  Pick<
    Evaluation,
    | 'feature_text'
    | 'score_atmosphere'
    | 'score_looks'
    | 'score_commitment'
    | 'score_want_in'
    | 'memo'
  >
>;

export type UpdateEvaluationData = UpsertEvaluationData;

// ---------- Row 型 ----------

type EvaluationWithMemberRow = {
  id: string;
  freshman_id: string;
  feature_text: string | null;
  score_atmosphere: number | null;
  score_looks: number | null;
  score_commitment: number | null;
  score_want_in: number | null;
  memo: string | null;
  created_at: string;
  updated_at: string;
  members: { id: string; name: string } | null;
};

// ---------- getEvaluationsByFreshmanId ----------

export async function getEvaluationsByFreshmanId(
  freshmanId: string
): Promise<EvaluationWithMember[]> {
  const { data, error } = await supabaseAdmin
    .from('evaluations')
    .select(
      'id, freshman_id, feature_text, score_atmosphere, score_looks, score_commitment, score_want_in, memo, created_at, updated_at, members(id, name)'
    )
    .eq('freshman_id', freshmanId)
    .order('created_at', { ascending: false });
  if (error) throw error;

  return ((data ?? []) as unknown as EvaluationWithMemberRow[]).map((row) => ({
    id: row.id,
    freshman_id: row.freshman_id,
    feature_text: row.feature_text,
    score_atmosphere: row.score_atmosphere,
    score_looks: row.score_looks,
    score_commitment: row.score_commitment,
    score_want_in: row.score_want_in,
    memo: row.memo,
    created_at: row.created_at,
    updated_at: row.updated_at,
    member: row.members ?? { id: '', name: '' },
  }));
}

// ---------- upsertEvaluation ----------

export async function upsertEvaluation(
  freshmanId: string,
  memberId: string,
  data: UpsertEvaluationData
): Promise<Evaluation> {
  const { data: result, error } = await supabaseAdmin
    .from('evaluations')
    .upsert(
      {
        freshman_id: freshmanId,
        member_id: memberId,
        ...data,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'freshman_id,member_id' }
    )
    .select(
      'id, freshman_id, member_id, feature_text, score_atmosphere, score_looks, score_commitment, score_want_in, memo, created_at, updated_at'
    )
    .single();
  if (error) throw error;
  return result as Evaluation;
}

// ---------- updateEvaluation ----------

export async function updateEvaluation(
  id: string,
  data: UpdateEvaluationData
): Promise<void> {
  const { error } = await supabaseAdmin
    .from('evaluations')
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

// ---------- getEvaluationById ----------

export async function getEvaluationById(
  id: string
): Promise<Pick<Evaluation, 'id' | 'member_id'> | null> {
  const { data, error } = await supabaseAdmin
    .from('evaluations')
    .select('id, member_id')
    .eq('id', id)
    .single();
  if (error) {
    if (error.code === 'PGRST116') return null; // not found
    throw error;
  }
  return data as Pick<Evaluation, 'id' | 'member_id'>;
}
