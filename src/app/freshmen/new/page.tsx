'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { getMemberId, apiFetch } from '@/lib/api';

// ---- 型定義 ----
type Member = { id: string; name: string; is_phone_staff: boolean; is_leader: boolean };
type FreshmanListItem = { id: string; name: string };

const SCORE_LABELS: Record<string, { min: string; max: string }> = {
  score_atmosphere: {
    min: 'サークルの雰囲気に合わなそう',
    max: 'ノリめっちゃ良くて合いそう！',
  },
  score_looks: {
    min: '普通以下',
    max: '芸能人レベル（絶対入れたい）',
  },
  score_commitment: {
    min: '来てくれなそう',
    max: 'イベントもテニスも来てくれそう',
  },
  score_want_in: {
    min: 'まあいらないかな',
    max: '絶対に入れたい。取られたら死',
  },
};

// ---- スコアボタンコンポーネント ----
function ScoreSelector({
  label,
  fieldKey,
  value,
  onChange,
}: {
  label: string;
  fieldKey: string;
  value: number | null;
  onChange: (val: number) => void;
}) {
  const desc = SCORE_LABELS[fieldKey];
  return (
    <div className="space-y-1">
      <label className="block text-sm font-medium text-gray-700">{label}</label>
      {desc && (
        <div className="flex flex-col sm:flex-row sm:justify-between text-xs text-gray-400 gap-0.5">
          <span>1: {desc.min}</span>
          <span className="sm:text-right">5: {desc.max}</span>
        </div>
      )}
      <div className="flex gap-2">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            className={`flex-1 py-2 rounded-lg text-sm font-semibold border transition-colors ${
              value === n
                ? 'bg-orange-500 text-white border-orange-500'
                : 'bg-white text-gray-700 border-gray-300 hover:border-orange-400'
            }`}
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  );
}

// ---- メインページ ----
export default function NewFreshmanPage() {
  const router = useRouter();
  const [memberId, setMemberIdState] = useState<string | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [existingFreshmen, setExistingFreshmen] = useState<FreshmanListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // フォーム状態
  const [name, setName] = useState('');
  const [department, setDepartment] = useState('');
  const [alldcFlag, setAlldcFlag] = useState(false);
  const [assigneeIds, setAssigneeIds] = useState<string[]>([]);
  const [featureText, setFeatureText] = useState('');
  const [scoreAtmosphere, setScoreAtmosphere] = useState<number | null>(null);
  const [scoreLooks, setScoreLooks] = useState<number | null>(null);
  const [scoreCommitment, setScoreCommitment] = useState<number | null>(null);
  const [scoreWantIn, setScoreWantIn] = useState<number | null>(null);
  const [memo, setMemo] = useState('');
  const [friendIds, setFriendIds] = useState<string[]>([]);
  const [friendSearch, setFriendSearch] = useState('');

  const fetchData = useCallback(async (mid: string) => {
    try {
      const [membersRes, freshmenRes] = await Promise.all([
        apiFetch('/api/members'),
        apiFetch('/api/freshmen'),
      ]);
      const membersJson = await membersRes.json();
      const freshmenJson = await freshmenRes.json();

      if (membersJson.success) {
        setMembers(membersJson.data);
        // 自分を初期選択
        if (membersJson.data.some((m: Member) => m.id === mid)) {
          setAssigneeIds([mid]);
        }
      }
      if (freshmenJson.success) {
        setExistingFreshmen(freshmenJson.data);
      }
    } catch {
      setError('データの取得に失敗しました');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const mid = getMemberId();
    if (!mid) {
      router.replace('/select-member');
      return;
    }
    setMemberIdState(mid);
    fetchData(mid);
  }, [router, fetchData]);

  const toggleAssignee = (id: string) => {
    setAssigneeIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const toggleFriend = (id: string) => {
    setFriendIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const filteredFreshmen = existingFreshmen.filter((f) =>
    f.name.includes(friendSearch)
  );

  const hasEvaluation =
    featureText ||
    scoreAtmosphere ||
    scoreLooks ||
    scoreCommitment ||
    scoreWantIn ||
    memo;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('名前は必須です');
      return;
    }
    if (assigneeIds.length === 0) {
      setError('担当者を1人以上選択してください');
      return;
    }

    setSubmitting(true);
    setError(null);

    const body: Record<string, unknown> = {
      name: name.trim(),
      department: department.trim() || undefined,
      alldc_flag: alldcFlag,
      assignee_ids: assigneeIds,
      friend_ids: friendIds,
    };

    if (hasEvaluation) {
      const evaluation: Record<string, unknown> = {};
      if (featureText) evaluation.feature_text = featureText;
      if (scoreAtmosphere) evaluation.score_atmosphere = scoreAtmosphere;
      if (scoreLooks) evaluation.score_looks = scoreLooks;
      if (scoreCommitment) evaluation.score_commitment = scoreCommitment;
      if (scoreWantIn) evaluation.score_want_in = scoreWantIn;
      if (memo) evaluation.memo = memo;
      body.evaluation = evaluation;
    }

    try {
      const res = await apiFetch('/api/freshmen', {
        method: 'POST',
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (json.success) {
        router.push('/dashboard');
      } else {
        setError(json.error?.message ?? '登録に失敗しました');
      }
    } catch {
      setError('ネットワークエラーが発生しました');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-gray-500">読み込み中...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <header className="sticky top-0 z-10 bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3">
        <button
          type="button"
          onClick={() => router.push('/dashboard')}
          className="text-gray-600 hover:text-gray-900 text-sm flex items-center gap-1"
        >
          ← 戻る
        </button>
        <h1 className="text-lg font-bold text-gray-900">新入生登録</h1>
      </header>

      <form onSubmit={handleSubmit} className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        {/* 名前 */}
        <div className="bg-white rounded-xl p-4 space-y-1 shadow-sm">
          <label className="block text-sm font-medium text-gray-700">
            名前 <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="例: 田中花子"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-orange-400"
            required
          />
        </div>

        {/* 学部 */}
        <div className="bg-white rounded-xl p-4 space-y-1 shadow-sm">
          <label className="block text-sm font-medium text-gray-700">学部（任意）</label>
          <input
            type="text"
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
            placeholder="例: 法学部"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-orange-400"
          />
        </div>

        {/* ALLDC */}
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={alldcFlag}
              onChange={(e) => setAlldcFlag(e.target.checked)}
              className="w-5 h-5 accent-orange-500"
            />
            <div>
              <span className="text-sm font-medium text-gray-700">ALLDC</span>
              <p className="text-xs text-gray-400">他サークルとの掛け持ち希望</p>
            </div>
          </label>
        </div>

        {/* 担当者 */}
        <div className="bg-white rounded-xl p-4 shadow-sm space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            担当者 <span className="text-red-500">*</span>
          </label>
          <div className="flex flex-wrap gap-2">
            {members.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => toggleAssignee(m.id)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                  assigneeIds.includes(m.id)
                    ? 'bg-orange-500 text-white border-orange-500'
                    : 'bg-white text-gray-700 border-gray-300 hover:border-orange-400'
                } ${m.id === memberId ? 'ring-2 ring-orange-300' : ''}`}
              >
                {m.name}
                {m.id === memberId && <span className="ml-1 text-xs opacity-75">(自分)</span>}
              </button>
            ))}
          </div>
          {assigneeIds.length === 0 && (
            <p className="text-xs text-red-400">担当者を選択してください</p>
          )}
        </div>

        {/* 評価セクション */}
        <div className="bg-white rounded-xl p-4 shadow-sm space-y-4">
          <h2 className="text-sm font-bold text-gray-700">評価（任意）</h2>

          {/* 特徴テキスト */}
          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700">特徴テキスト</label>
            <textarea
              value={featureText}
              onChange={(e) => setFeatureText(e.target.value)}
              placeholder="見た目・雰囲気など特徴を入力"
              rows={2}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-orange-400 resize-none"
            />
          </div>

          {/* スコア */}
          <ScoreSelector
            label="雰囲気"
            fieldKey="score_atmosphere"
            value={scoreAtmosphere}
            onChange={setScoreAtmosphere}
          />
          <ScoreSelector
            label="見た目"
            fieldKey="score_looks"
            value={scoreLooks}
            onChange={setScoreLooks}
          />
          <ScoreSelector
            label="コミット度"
            fieldKey="score_commitment"
            value={scoreCommitment}
            onChange={setScoreCommitment}
          />
          <ScoreSelector
            label="入れたい度"
            fieldKey="score_want_in"
            value={scoreWantIn}
            onChange={setScoreWantIn}
          />

          {/* メモ */}
          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700">その他備考</label>
            <textarea
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              placeholder="その他メモ"
              rows={2}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-orange-400 resize-none"
            />
          </div>
        </div>

        {/* 友人選択 */}
        {existingFreshmen.length > 0 && (
          <div className="bg-white rounded-xl p-4 shadow-sm space-y-2">
            <label className="block text-sm font-medium text-gray-700">友人（任意）</label>
            <input
              type="text"
              value={friendSearch}
              onChange={(e) => setFriendSearch(e.target.value)}
              placeholder="名前で検索..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
            />
            <div className="max-h-48 overflow-y-auto space-y-1">
              {filteredFreshmen.map((f) => (
                <label
                  key={f.id}
                  className="flex items-center gap-3 px-2 py-1.5 rounded-lg hover:bg-gray-50 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={friendIds.includes(f.id)}
                    onChange={() => toggleFriend(f.id)}
                    className="w-4 h-4 accent-orange-500"
                  />
                  <span className="text-sm text-gray-700">{f.name}</span>
                </label>
              ))}
              {filteredFreshmen.length === 0 && (
                <p className="text-sm text-gray-400 px-2 py-2">該当する新入生がいません</p>
              )}
            </div>
            {friendIds.length > 0 && (
              <p className="text-xs text-orange-600">{friendIds.length}人選択中</p>
            )}
          </div>
        )}

        {/* 送信ボタン */}
        <button
          type="submit"
          disabled={submitting || !name.trim() || assigneeIds.length === 0}
          className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl transition-colors text-base"
        >
          {submitting ? '登録中...' : '登録する'}
        </button>
      </form>
    </div>
  );
}
