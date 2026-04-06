import { supabaseAdmin } from '@/lib/supabase';
import type { Freshman, FreshmanListItem, FreshmanDetail, FreshmanSummary } from '@/domain/models/freshman';

// ---------- 型定義 ----------

export type FreshmanStatus = 'line_waiting' | 'apo_done' | 'ketsu_done' | 'alldc';
export type FreshmanSort = 'created_at_desc' | 'want_in_desc';

export type GetFreshmenListParams = {
  status?: FreshmanStatus;
  member_id?: string;
  sort?: FreshmanSort;
};

export type CreateFreshmanParams = {
  name: string;
  department?: string | null;
  alldc_flag?: boolean;
  created_by: string;
};

export type UpdateFreshmanData = Partial<
  Pick<
    Freshman,
    | 'name'
    | 'department'
    | 'alldc_flag'
    | 'status_line_done'
    | 'apo_label'
    | 'apo_date'
    | 'apo_time'
    | 'ketsu_done'
  >
>;

export type MyCallItem = Freshman & {
  avg_score_want_in: number | null;
  latest_memo: string | null;
};

// ---------- Row 型（Supabase の生の返り値） ----------

type AssignmentRow = {
  freshman_id: string;
  members: { id: string; name: string } | null;
};

type EvalAvgRow = {
  freshman_id: string;
  avg_score_want_in: number | null;
};

type EvalRow = {
  freshman_id: string;
  score_want_in: number | null;
  memo: string | null;
};

type FriendshipRow = {
  freshman_id_1: string;
  freshman_id_2: string;
};

// ---------- ヘルパー ----------

/**
 * evaluations テーブルから freshman_id ごとの avg_score_want_in を計算する。
 * Supabase JS では GROUP BY + AVG が直接できないため JS 側で集計。
 */
async function fetchAvgScoreWantIn(
  freshmanIds: string[]
): Promise<Map<string, number | null>> {
  if (freshmanIds.length === 0) return new Map();

  const { data, error } = await supabaseAdmin
    .from('evaluations')
    .select('freshman_id, score_want_in')
    .in('freshman_id', freshmanIds);
  if (error) throw error;

  const rows = (data ?? []) as EvalRow[];
  const map = new Map<string, number | null>();

  // freshman_id ごとに集計
  const grouped = new Map<string, number[]>();
  for (const row of rows) {
    if (row.score_want_in == null) continue;
    const arr = grouped.get(row.freshman_id) ?? [];
    arr.push(row.score_want_in);
    grouped.set(row.freshman_id, arr);
  }

  for (const id of freshmanIds) {
    const scores = grouped.get(id);
    if (!scores || scores.length === 0) {
      map.set(id, null);
    } else {
      const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
      map.set(id, avg);
    }
  }

  return map;
}

/**
 * assignments テーブルから freshman_id ごとの担当者一覧を取得。
 */
async function fetchAssigneesMap(
  freshmanIds: string[]
): Promise<Map<string, Array<{ id: string; name: string }>>> {
  if (freshmanIds.length === 0) return new Map();

  const { data, error } = await supabaseAdmin
    .from('assignments')
    .select('freshman_id, members(id, name)')
    .in('freshman_id', freshmanIds);
  if (error) throw error;

  const rows = (data ?? []) as unknown as AssignmentRow[];
  const map = new Map<string, Array<{ id: string; name: string }>>();

  for (const row of rows) {
    if (!row.members) continue;
    const list = map.get(row.freshman_id) ?? [];
    list.push(row.members);
    map.set(row.freshman_id, list);
  }

  return map;
}

// ---------- getFreshmenList ----------

export async function getFreshmenList(
  params: GetFreshmenListParams = {}
): Promise<FreshmanListItem[]> {
  const { status, member_id, sort = 'created_at_desc' } = params;

  // member_id フィルタ: 先に対象 freshman_id を取得
  let filteredFreshmanIds: string[] | null = null;
  if (member_id) {
    const { data: asgData, error: asgError } = await supabaseAdmin
      .from('assignments')
      .select('freshman_id')
      .eq('member_id', member_id);
    if (asgError) throw asgError;
    filteredFreshmanIds = (asgData ?? []).map((r: { freshman_id: string }) => r.freshman_id);
    // 担当が 0 件なら即返却
    if (filteredFreshmanIds.length === 0) return [];
  }

  // freshmen クエリ構築
  let query = supabaseAdmin
    .from('freshmen')
    .select(
      'id, name, department, alldc_flag, status_line_done, apo_label, apo_date, apo_time, ketsu_done, created_by, created_at, updated_at'
    );

  // ステータスフィルタ
  if (status === 'line_waiting') {
    query = query.eq('status_line_done', false);
  } else if (status === 'apo_done') {
    query = query.not('apo_label', 'is', null).neq('apo_label', '音信不通');
  } else if (status === 'ketsu_done') {
    query = query.eq('ketsu_done', true);
  } else if (status === 'alldc') {
    query = query.eq('alldc_flag', true);
  }

  // member_id フィルタ
  if (filteredFreshmanIds !== null) {
    query = query.in('id', filteredFreshmanIds);
  }

  // デフォルトソート（want_in_desc は JS 側で後処理）
  if (sort !== 'want_in_desc') {
    query = query.order('created_at', { ascending: false });
  }

  const { data: freshmenData, error: freshmenError } = await query;
  if (freshmenError) throw freshmenError;

  const freshmen = (freshmenData ?? []) as Freshman[];
  if (freshmen.length === 0) return [];

  const ids = freshmen.map((f) => f.id);

  // N+1 回避: まとめて取得
  const [assigneesMap, avgMap] = await Promise.all([
    fetchAssigneesMap(ids),
    fetchAvgScoreWantIn(ids),
  ]);

  let result: FreshmanListItem[] = freshmen.map((f) => ({
    ...f,
    assignees: assigneesMap.get(f.id) ?? [],
    avg_score_want_in: avgMap.get(f.id) ?? null,
  }));

  // want_in_desc ソート（JS 側）
  if (sort === 'want_in_desc') {
    result = result.sort((a, b) => {
      if (a.avg_score_want_in == null && b.avg_score_want_in == null) return 0;
      if (a.avg_score_want_in == null) return 1;
      if (b.avg_score_want_in == null) return -1;
      return b.avg_score_want_in - a.avg_score_want_in;
    });
  }

  return result;
}

// ---------- getFreshmanById ----------

export async function getFreshmanById(id: string): Promise<FreshmanDetail | null> {
  const { data, error } = await supabaseAdmin
    .from('freshmen')
    .select(
      'id, name, department, alldc_flag, status_line_done, apo_label, apo_date, apo_time, ketsu_done, created_by, created_at, updated_at'
    )
    .eq('id', id)
    .single();
  if (error) {
    if (error.code === 'PGRST116') return null; // not found
    throw error;
  }

  const freshman = data as Freshman;

  // 担当者取得
  const [assigneesMap] = await Promise.all([fetchAssigneesMap([id])]);
  const assignees = assigneesMap.get(id) ?? [];

  // 友達関係取得
  const { data: friendshipData, error: friendshipError } = await supabaseAdmin
    .from('friendships')
    .select('freshman_id_1, freshman_id_2')
    .or(`freshman_id_1.eq.${id},freshman_id_2.eq.${id}`);
  if (friendshipError) throw friendshipError;

  const friendships = (friendshipData ?? []) as FriendshipRow[];
  const friendIds = friendships.map((f) =>
    f.freshman_id_1 === id ? f.freshman_id_2 : f.freshman_id_1
  );

  let friends: Array<{ id: string; name: string }> = [];
  if (friendIds.length > 0) {
    const { data: friendsData, error: friendsError } = await supabaseAdmin
      .from('freshmen')
      .select('id, name')
      .in('id', friendIds);
    if (friendsError) throw friendsError;
    friends = (friendsData ?? []) as Array<{ id: string; name: string }>;
  }

  return {
    ...freshman,
    assignees,
    friends,
  };
}

// ---------- createFreshman ----------

export async function createFreshman(params: CreateFreshmanParams): Promise<string> {
  const { data, error } = await supabaseAdmin
    .from('freshmen')
    .insert({
      name: params.name,
      department: params.department ?? null,
      alldc_flag: params.alldc_flag ?? false,
      created_by: params.created_by,
    })
    .select('id')
    .single();
  if (error) throw error;
  return (data as { id: string }).id;
}

// ---------- updateFreshman ----------

export async function updateFreshman(
  id: string,
  data: UpdateFreshmanData
): Promise<void> {
  // 音信不通の場合は apo_date / apo_time を強制 null
  const payload: UpdateFreshmanData = { ...data };
  if (payload.apo_label === '音信不通') {
    payload.apo_date = null;
    payload.apo_time = null;
  }

  const { error } = await supabaseAdmin
    .from('freshmen')
    .update({ ...payload, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

// ---------- getFreshmenSummary ----------

export async function getFreshmenSummary(): Promise<FreshmanSummary> {
  const { count: total, error: e1 } = await supabaseAdmin
    .from('freshmen')
    .select('*', { count: 'exact', head: true });
  if (e1) throw e1;

  const { count: line_done, error: e2 } = await supabaseAdmin
    .from('freshmen')
    .select('*', { count: 'exact', head: true })
    .eq('status_line_done', true);
  if (e2) throw e2;

  const { count: apo_done, error: e3 } = await supabaseAdmin
    .from('freshmen')
    .select('*', { count: 'exact', head: true })
    .not('apo_label', 'is', null)
    .neq('apo_label', '音信不通');
  if (e3) throw e3;

  const { count: ketsu_done, error: e4 } = await supabaseAdmin
    .from('freshmen')
    .select('*', { count: 'exact', head: true })
    .eq('ketsu_done', true);
  if (e4) throw e4;

  return {
    total: total ?? 0,
    line_done: line_done ?? 0,
    apo_done: apo_done ?? 0,
    ketsu_done: ketsu_done ?? 0,
  };
}

// ---------- getMyCalls ----------

export async function getMyCalls(_memberId: string): Promise<MyCallItem[]> {
  // アポ獲得済みの新入生を全員取得
  const { data: freshmenData, error: freshmenError } = await supabaseAdmin
    .from('freshmen')
    .select(
      'id, name, department, alldc_flag, status_line_done, apo_label, apo_date, apo_time, ketsu_done, created_by, created_at, updated_at'
    )
    .eq('apo_label', 'アポ獲得');
  if (freshmenError) throw freshmenError;

  const freshmen = (freshmenData ?? []) as Freshman[];
  if (freshmen.length === 0) return [];

  const ids = freshmen.map((f) => f.id);

  // avg_score_want_in と latest_memo を取得
  const { data: evalData, error: evalError } = await supabaseAdmin
    .from('evaluations')
    .select('freshman_id, score_want_in, memo, created_at')
    .in('freshman_id', ids);
  if (evalError) throw evalError;

  type EvalFullRow = EvalRow & { created_at: string };
  const evals = (evalData ?? []) as EvalFullRow[];

  // freshman_id ごとに avg と latest_memo を集計
  const avgMap = new Map<string, number | null>();
  const memoMap = new Map<string, string | null>();

  const grouped = new Map<string, EvalFullRow[]>();
  for (const ev of evals) {
    const arr = grouped.get(ev.freshman_id) ?? [];
    arr.push(ev);
    grouped.set(ev.freshman_id, arr);
  }

  for (const fid of ids) {
    const group = grouped.get(fid) ?? [];
    const scores = group.map((e) => e.score_want_in).filter((s): s is number => s != null);
    avgMap.set(fid, scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : null);

    // latest_memo: created_at 降順で最初の non-null memo
    const sorted = [...group].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
    const latestWithMemo = sorted.find((e) => e.memo != null);
    memoMap.set(fid, latestWithMemo?.memo ?? null);
  }

  const result: MyCallItem[] = freshmen.map((f) => ({
    ...f,
    avg_score_want_in: avgMap.get(f.id) ?? null,
    latest_memo: memoMap.get(f.id) ?? null,
  }));

  // avg_score_want_in 降順
  return result.sort((a, b) => {
    if (a.avg_score_want_in == null && b.avg_score_want_in == null) return 0;
    if (a.avg_score_want_in == null) return 1;
    if (b.avg_score_want_in == null) return -1;
    return b.avg_score_want_in - a.avg_score_want_in;
  });
}
