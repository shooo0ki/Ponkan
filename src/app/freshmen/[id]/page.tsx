'use client';

import { useEffect, useState, useCallback, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getMemberId, apiFetch } from '@/lib/api';

// ---- 型定義 ----
type ApoLabel = 'LINE送信済み' | 'アポ獲得' | '後日電話' | '後日カフェ' | '音信不通';
type ApoTime = '20:00' | '20:30' | '21:00' | '21:30' | '22:00' | '22:30' | '23:00';

type FreshmanDetail = {
  id: string;
  name: string;
  department: string | null;
  alldc_flag: boolean;
  status_line_done: boolean;
  apo_label: ApoLabel | null;
  apo_date: string | null;
  apo_time: ApoTime | null;
  ketsu_done: boolean;
  assignees: Array<{ id: string; name: string }>;
  friends: Array<{ id: string; name: string }>;
  created_at: string;
  updated_at: string;
};

type EvalEntry = {
  id: string;
  member: { id: string; name: string };
  feature_text: string | null;
  score_atmosphere: number | null;
  score_looks: number | null;
  score_commitment: number | null;
  score_want_in: number | null;
  memo: string | null;
  created_at: string;
  updated_at: string;
};

type Screenshot = {
  id: string;
  image_url: string;
  uploader: { id: string; name: string };
  created_at: string;
};

const APO_LABELS: ApoLabel[] = ['LINE送信済み', 'アポ獲得', '後日電話', '後日カフェ', '音信不通'];
const APO_DATES = ['2026-04-07', '2026-04-08', '2026-04-09'];
const APO_TIMES: ApoTime[] = ['20:00', '20:30', '21:00', '21:30', '22:00', '22:30', '23:00'];

// ---- スコア星表示 ----
function Stars({ score }: { score: number | null }) {
  if (score == null) return <span className="text-gray-300 text-sm">未評価</span>;
  return (
    <span className="text-yellow-400">
      {'★'.repeat(score)}{'☆'.repeat(5 - score)}
    </span>
  );
}

// ---- スコア入力ボタン ----
function ScoreInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number | null;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-gray-600 w-20 shrink-0">{label}</span>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            onClick={() => onChange(n)}
            className={`w-8 h-8 rounded-full text-sm font-bold border-2 transition-colors ${
              value === n
                ? 'bg-orange-500 border-orange-500 text-white'
                : 'border-gray-300 text-gray-400 hover:border-orange-300'
            }`}
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  );
}

// ---- 評価フォーム ----
type EvalFormData = {
  feature_text: string;
  score_atmosphere: number | null;
  score_looks: number | null;
  score_commitment: number | null;
  score_want_in: number | null;
  memo: string;
};

function EvalForm({
  initial,
  onSubmit,
  onCancel,
  submitting,
}: {
  initial?: Partial<EvalFormData>;
  onSubmit: (data: EvalFormData) => void;
  onCancel: () => void;
  submitting: boolean;
}) {
  const [form, setForm] = useState<EvalFormData>({
    feature_text: initial?.feature_text ?? '',
    score_atmosphere: initial?.score_atmosphere ?? null,
    score_looks: initial?.score_looks ?? null,
    score_commitment: initial?.score_commitment ?? null,
    score_want_in: initial?.score_want_in ?? null,
    memo: initial?.memo ?? '',
  });

  return (
    <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 space-y-3">
      <div>
        <label className="text-xs font-medium text-gray-500 mb-1 block">特徴</label>
        <textarea
          value={form.feature_text}
          onChange={(e) => setForm((f) => ({ ...f, feature_text: e.target.value }))}
          rows={2}
          placeholder="見た目・雰囲気・話した内容など"
          className="w-full border border-gray-200 rounded-lg p-2 text-sm resize-none"
        />
      </div>
      <div className="space-y-2">
        <ScoreInput label="雰囲気" value={form.score_atmosphere} onChange={(v) => setForm((f) => ({ ...f, score_atmosphere: v }))} />
        <ScoreInput label="見た目" value={form.score_looks} onChange={(v) => setForm((f) => ({ ...f, score_looks: v }))} />
        <ScoreInput label="コミット" value={form.score_commitment} onChange={(v) => setForm((f) => ({ ...f, score_commitment: v }))} />
        <ScoreInput label="入れたい度" value={form.score_want_in} onChange={(v) => setForm((f) => ({ ...f, score_want_in: v }))} />
      </div>
      <div>
        <label className="text-xs font-medium text-gray-500 mb-1 block">メモ</label>
        <textarea
          value={form.memo}
          onChange={(e) => setForm((f) => ({ ...f, memo: e.target.value }))}
          rows={2}
          placeholder="その他備考"
          className="w-full border border-gray-200 rounded-lg p-2 text-sm resize-none"
        />
      </div>
      <div className="flex gap-2">
        <button
          onClick={() => onSubmit(form)}
          disabled={submitting}
          className="flex-1 bg-orange-500 text-white py-2 rounded-lg text-sm font-medium disabled:opacity-50"
        >
          {submitting ? '保存中...' : '保存'}
        </button>
        <button onClick={onCancel} className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-600">
          キャンセル
        </button>
      </div>
    </div>
  );
}

// ---- メインページ ----
export default function FreshmanDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const memberId = typeof window !== 'undefined' ? getMemberId() : null;

  const [freshman, setFreshman] = useState<FreshmanDetail | null>(null);
  const [evals, setEvals] = useState<EvalEntry[]>([]);
  const [screenshots, setScreenshots] = useState<Screenshot[]>([]);
  const [loading, setLoading] = useState(true);

  // 評価フォーム表示状態
  const [showAddEval, setShowAddEval] = useState(false);
  const [editingEvalId, setEditingEvalId] = useState<string | null>(null);
  const [submittingEval, setSubmittingEval] = useState(false);

  // スクショ
  const [uploadingScreenshot, setUploadingScreenshot] = useState(false);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  // ステータス更新中
  const [patchingStatus, setPatchingStatus] = useState(false);

  useEffect(() => {
    if (!getMemberId()) {
      router.replace('/select-member');
      return;
    }
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [fRes, eRes, sRes] = await Promise.all([
        fetch(`/api/freshmen/${id}`),
        fetch(`/api/freshmen/${id}/evaluations`),
        fetch(`/api/freshmen/${id}/screenshots`),
      ]);
      const [fData, eData, sData] = await Promise.all([fRes.json(), eRes.json(), sRes.json()]);
      if (fData.success) setFreshman(fData.data);
      if (eData.success) setEvals(eData.data);
      if (sData.success) setScreenshots(sData.data);
    } finally {
      setLoading(false);
    }
  }, [id]);

  const patchFreshman = useCallback(
    async (data: Record<string, unknown>) => {
      if (!freshman) return;
      setPatchingStatus(true);
      try {
        const res = await apiFetch(`/api/freshmen/${id}`, {
          method: 'PATCH',
          body: JSON.stringify(data),
        });
        const json = await res.json();
        if (json.success) {
          setFreshman((f) => (f ? { ...f, ...data } : f));
        }
      } finally {
        setPatchingStatus(false);
      }
    },
    [id, freshman]
  );

  const handleAddEval = useCallback(
    async (data: EvalFormData) => {
      setSubmittingEval(true);
      try {
        const res = await apiFetch(`/api/freshmen/${id}/evaluations`, {
          method: 'POST',
          body: JSON.stringify({
            feature_text: data.feature_text || undefined,
            score_atmosphere: data.score_atmosphere ?? undefined,
            score_looks: data.score_looks ?? undefined,
            score_commitment: data.score_commitment ?? undefined,
            score_want_in: data.score_want_in ?? undefined,
            memo: data.memo || undefined,
          }),
        });
        if (res.ok) {
          setShowAddEval(false);
          const eRes = await fetch(`/api/freshmen/${id}/evaluations`);
          const eData = await eRes.json();
          if (eData.success) setEvals(eData.data);
        }
      } finally {
        setSubmittingEval(false);
      }
    },
    [id]
  );

  const handleEditEval = useCallback(
    async (evalId: string, data: EvalFormData) => {
      setSubmittingEval(true);
      try {
        const res = await apiFetch(`/api/evaluations/${evalId}`, {
          method: 'PATCH',
          body: JSON.stringify({
            feature_text: data.feature_text || undefined,
            score_atmosphere: data.score_atmosphere ?? undefined,
            score_looks: data.score_looks ?? undefined,
            score_commitment: data.score_commitment ?? undefined,
            score_want_in: data.score_want_in ?? undefined,
            memo: data.memo || undefined,
          }),
        });
        if (res.ok) {
          setEditingEvalId(null);
          const eRes = await fetch(`/api/freshmen/${id}/evaluations`);
          const eData = await eRes.json();
          if (eData.success) setEvals(eData.data);
        }
      } finally {
        setSubmittingEval(false);
      }
    },
    [id]
  );

  const handleScreenshotUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      setUploadingScreenshot(true);
      try {
        const formData = new FormData();
        formData.append('file', file);
        const mid = getMemberId();
        const res = await fetch(`/api/freshmen/${id}/screenshots`, {
          method: 'POST',
          headers: mid ? { 'X-Member-Id': mid } : {},
          body: formData,
        });
        if (res.ok) {
          const sRes = await fetch(`/api/freshmen/${id}/screenshots`);
          const sData = await sRes.json();
          if (sData.success) setScreenshots(sData.data);
        }
      } finally {
        setUploadingScreenshot(false);
        e.target.value = '';
      }
    },
    [id]
  );

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center text-gray-400">読み込み中...</div>;
  }

  if (!freshman) {
    return <div className="flex min-h-screen items-center justify-center text-gray-400">新入生が見つかりません</div>;
  }

  const myEval = evals.find((e) => e.member.id === memberId);
  const hasMyEval = !!myEval;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={() => router.back()} className="text-gray-500 hover:text-gray-800 text-sm">
            ← 戻る
          </button>
          <h1 className="font-bold text-lg flex-1">{freshman.name}</h1>
          <Link
            href={`/freshmen/${id}/call`}
            className="bg-orange-500 text-white text-sm px-3 py-1.5 rounded-lg font-medium"
          >
            📞 電話
          </Link>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-4 space-y-4">
        {/* 基本情報 */}
        <section className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-start justify-between mb-2">
            <div>
              <h2 className="text-xl font-bold">{freshman.name}</h2>
              {freshman.department && <p className="text-sm text-gray-500">{freshman.department}</p>}
            </div>
            {freshman.alldc_flag && (
              <span className="bg-purple-100 text-purple-700 text-xs font-bold px-2 py-1 rounded-full">ALLDC</span>
            )}
          </div>

          {/* 担当者 */}
          <div className="mb-3">
            <p className="text-xs text-gray-600 font-medium mb-1">担当者（LINE交換者）</p>
            <div className="flex flex-wrap gap-1">
              {freshman.assignees.length > 0 ? (
                freshman.assignees.map((a) => (
                  <span key={a.id} className="bg-orange-100 text-orange-700 text-xs px-2 py-0.5 rounded-full">
                    {a.name}
                  </span>
                ))
              ) : (
                <span className="text-gray-400 text-xs">なし</span>
              )}
            </div>
          </div>

          {/* 友人 */}
          {freshman.friends.length > 0 && (
            <div>
              <p className="text-xs text-gray-600 font-medium mb-1">友人</p>
              <div className="flex flex-wrap gap-1">
                {freshman.friends.map((f) => (
                  <Link
                    key={f.id}
                    href={`/freshmen/${f.id}`}
                    className="bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded-full hover:underline"
                  >
                    {f.name}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* ステータス */}
        <section className="bg-white rounded-xl p-4 shadow-sm space-y-3">
          <h3 className="font-semibold text-sm text-gray-700">ステータス</h3>

          {/* LINE済 */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">LINE交換済み</span>
            <button
              onClick={() => patchFreshman({ status_line_done: !freshman.status_line_done })}
              disabled={patchingStatus}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                freshman.status_line_done
                  ? 'bg-green-500 text-white'
                  : 'bg-gray-200 text-gray-600'
              }`}
            >
              {freshman.status_line_done ? '✓ 済み' : '未'}
            </button>
          </div>

          {/* アポラベル */}
          <div>
            <label className="text-sm text-gray-600 block mb-1">電話アポ状況</label>
            <select
              value={freshman.apo_label ?? ''}
              onChange={(e) => {
                const val = e.target.value as ApoLabel | '';
                patchFreshman({ apo_label: val || null });
              }}
              disabled={patchingStatus}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
            >
              <option value="">未対応</option>
              {APO_LABELS.map((l) => (
                <option key={l} value={l}>{l}</option>
              ))}
            </select>
          </div>

          {/* アポ日時（日時が必要なラベルのみ） */}
          {freshman.apo_label && ['アポ獲得', '後日電話', '後日カフェ'].includes(freshman.apo_label) && (
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="text-xs text-gray-700 font-medium mb-1 block">日付</label>
                <select
                  value={freshman.apo_date ?? ''}
                  onChange={(e) => patchFreshman({ apo_date: e.target.value || null })}
                  disabled={patchingStatus}
                  className="w-full border border-gray-200 rounded-lg px-2 py-2 text-sm"
                >
                  <option value="">選択</option>
                  {APO_DATES.map((d) => (
                    <option key={d} value={d}>{d.slice(5).replace('-', '/')}</option>
                  ))}
                </select>
              </div>
              <div className="flex-1">
                <label className="text-xs text-gray-700 font-medium mb-1 block">時刻</label>
                <select
                  value={freshman.apo_time ?? ''}
                  onChange={(e) => patchFreshman({ apo_time: (e.target.value as ApoTime) || null })}
                  disabled={patchingStatus}
                  className="w-full border border-gray-200 rounded-lg px-2 py-2 text-sm"
                >
                  <option value="">選択</option>
                  {APO_TIMES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* 決取得 */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">決取得（入会）</span>
            <button
              onClick={() => patchFreshman({ ketsu_done: !freshman.ketsu_done })}
              disabled={patchingStatus}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                freshman.ketsu_done
                  ? 'bg-green-500 text-white'
                  : 'bg-gray-200 text-gray-600'
              }`}
            >
              {freshman.ketsu_done ? '✓ 決取得！' : '未'}
            </button>
          </div>
        </section>

        {/* 評価エントリ */}
        <section className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-sm text-gray-700">評価（{evals.length}件）</h3>
            {!hasMyEval && !showAddEval && (
              <button
                onClick={() => setShowAddEval(true)}
                className="text-sm text-orange-600 font-medium"
              >
                ＋ 自分の評価を追加
              </button>
            )}
          </div>

          {showAddEval && (
            <div className="mb-3">
              <EvalForm
                onSubmit={handleAddEval}
                onCancel={() => setShowAddEval(false)}
                submitting={submittingEval}
              />
            </div>
          )}

          <div className="space-y-3">
            {evals.map((entry) => (
              <div key={entry.id} className="border border-gray-100 rounded-lg p-3">
                {editingEvalId === entry.id ? (
                  <EvalForm
                    initial={{
                      feature_text: entry.feature_text ?? '',
                      score_atmosphere: entry.score_atmosphere,
                      score_looks: entry.score_looks,
                      score_commitment: entry.score_commitment,
                      score_want_in: entry.score_want_in,
                      memo: entry.memo ?? '',
                    }}
                    onSubmit={(data) => handleEditEval(entry.id, data)}
                    onCancel={() => setEditingEvalId(null)}
                    submitting={submittingEval}
                  />
                ) : (
                  <>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold text-sm text-gray-900">{entry.member.name}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500">
                          {new Date(entry.created_at).toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </span>
                        {entry.member.id === memberId && (
                          <button
                            onClick={() => setEditingEvalId(entry.id)}
                            className="text-gray-400 hover:text-orange-500 text-xs"
                          >
                            ✏️
                          </button>
                        )}
                      </div>
                    </div>
                    {entry.feature_text && (
                      <p className="text-sm text-gray-700 mb-2">{entry.feature_text}</p>
                    )}
                    <div className="grid grid-cols-2 gap-1 text-xs mb-2">
                      <div className="flex items-center gap-1">
                        <span className="text-gray-600">雰囲気</span>
                        <Stars score={entry.score_atmosphere} />
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-gray-600">見た目</span>
                        <Stars score={entry.score_looks} />
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-gray-600">コミット</span>
                        <Stars score={entry.score_commitment} />
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-gray-600">入れたい</span>
                        <Stars score={entry.score_want_in} />
                      </div>
                    </div>
                    {entry.memo && <p className="text-xs text-gray-500 bg-gray-50 rounded p-2">{entry.memo}</p>}
                  </>
                )}
              </div>
            ))}
            {evals.length === 0 && !showAddEval && (
              <p className="text-sm text-gray-400 text-center py-4">評価がまだありません</p>
            )}
          </div>
        </section>

        {/* LINEスクショ */}
        <section className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-sm text-gray-700">LINEスクショ（{screenshots.length}件）</h3>
            <label className="text-sm text-orange-600 font-medium cursor-pointer">
              {uploadingScreenshot ? '送信中...' : '＋ 追加'}
              <input
                type="file"
                accept="image/jpeg,image/png"
                className="hidden"
                onChange={handleScreenshotUpload}
                disabled={uploadingScreenshot}
              />
            </label>
          </div>
          {screenshots.length > 0 ? (
            <div className="grid grid-cols-3 gap-2">
              {screenshots.map((s) => (
                <button key={s.id} onClick={() => setLightboxUrl(s.image_url)} className="aspect-square">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={s.image_url}
                    alt="LINEスクショ"
                    className="w-full h-full object-cover rounded-lg"
                  />
                </button>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400 text-center py-4">スクショがまだありません</p>
          )}
        </section>
      </div>

      {/* ライトボックス */}
      {lightboxUrl && (
        <div
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
          onClick={() => setLightboxUrl(null)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={lightboxUrl} alt="スクショ" className="max-w-full max-h-full rounded-lg" />
        </div>
      )}
    </div>
  );
}
