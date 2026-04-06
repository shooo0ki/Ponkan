'use client';

import { useEffect, useState, useCallback, use } from 'react';
import { useRouter } from 'next/navigation';
import { getMemberId, apiFetch } from '@/lib/api';

// ---- 型定義 ----
type ApoLabel = 'LINE送信済み' | 'アポ獲得' | '後日カフェ' | '音信不通';
type ApoTime =
  | '10:00' | '10:30' | '11:00' | '11:30' | '12:00' | '12:30' | '13:00' | '13:30'
  | '14:00' | '14:30' | '15:00' | '15:30' | '16:00' | '16:30' | '17:00'
  | '20:00' | '20:30' | '21:00' | '21:30' | '22:00' | '22:30' | '23:00';

type MyCallItem = {
  id: string;
  name: string;
  alldc_flag: boolean;
  avg_score_want_in: number | null;
  latest_memo: string | null;
  apo_label: ApoLabel | null;
  apo_date: string | null;
  apo_time: ApoTime | null;
  ketsu_done: boolean;
};

const APO_LABELS: ApoLabel[] = ['LINE送信済み', 'アポ獲得', '後日カフェ', '音信不通'];
const APO_DATES = ['2026-04-07', '2026-04-08', '2026-04-09'];
const APO_TIMES_PHONE: ApoTime[] = ['20:00', '20:30', '21:00', '21:30', '22:00', '22:30', '23:00'];
const APO_TIMES_CAFE: ApoTime[] = [
  '10:00', '10:30', '11:00', '11:30', '12:00', '12:30', '13:00', '13:30',
  '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00',
];

const PHONE_SCRIPT = `こんばんは！東大レモンスマッシュの〇〇です！
今日はカフェ来てくれてありがとう〜！今日話せて楽しかったよー！ありがとうー！
今日カフェ来てみてどうだった？

〇〇ちゃんの雰囲気がめっちゃレスマにあってるなって思って、話しててすごい楽しかったし、めっちゃ急でごめんなんだけど、ぜひ入って欲しいなって！

──────────────────────────

【よくある不安への返し】

・入会期限
　→ 枠が埋まる前に席を確保したい

・会費を払うのは6月末
　→ 仮入会って感じで3ヶ月間イベントとかテニス楽しめるから損はない！入り得

・兼サーも余裕
　→ 兼サーできないのはALLDCだけ。まだサークル見れてなくても全然OK

・お酒への不安
　→ 飲みたい人が飲むだけで強要とかは絶対にない

・ALLDCはコール禁止！？
　→ コール禁止っていうのはルールにするまでもないというか、それを売りにする必要なくないか？という認識

──────────────────────────

【ALLDCとの違い】

・会費のタイミング：ALLDCは4月に集める
・本女の割合：ALLDCは4大学のインカレだから本女が比較的少ない。レスマの方が多いから同じ大学の友達もたくさんできる

──────────────────────────

【自分の体験談】

私も去年急に電話きてまだサークルちゃんと見れてないしめっちゃ迷ったけど、会費のタイミングっていうのが一番刺さって入り得だなって思って入ったら楽しくて気づいたら残ってた笑

最初はいろんなサークルに入ってコミュニティ広げた方がいいよ！そのうちの一つとしてレスマどうかな？入会期限のせいであとから入ろうとしても入れないんだよね...`;

function ScoreBar({ score }: { score: number | null }) {
  if (score == null) return <span className="text-gray-400 text-xs">未評価</span>;
  const pct = (score / 5) * 100;
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 bg-gray-200 rounded-full h-1.5">
        <div className="bg-orange-500 h-1.5 rounded-full" style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-medium text-orange-600 w-6">{score.toFixed(1)}</span>
    </div>
  );
}

export default function CallPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  const [calls, setCalls] = useState<MyCallItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string>(id);
  const [activeTab, setActiveTab] = useState<'list' | 'info' | 'script'>('info');
  const [patching, setPatching] = useState(false);

  useEffect(() => {
    if (!getMemberId()) {
      router.replace('/select-member');
      return;
    }
    loadCalls();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadCalls = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch('/api/freshmen/my-calls');
      const data = await res.json();
      if (data.success) setCalls(data.data);
    } finally {
      setLoading(false);
    }
  }, []);

  const selected = calls.find((c) => c.id === selectedId) ?? calls[0] ?? null;

  const patchSelected = useCallback(
    async (updates: Record<string, unknown>) => {
      if (!selected) return;
      setPatching(true);
      try {
        const res = await apiFetch(`/api/freshmen/${selected.id}`, {
          method: 'PATCH',
          body: JSON.stringify(updates),
        });
        if (res.ok) {
          setCalls((prev) =>
            prev.map((c) => (c.id === selected.id ? { ...c, ...updates } : c))
          );
        }
      } finally {
        setPatching(false);
      }
    },
    [selected]
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 animate-pulse">
        <div className="bg-white border-b h-14" />
        <div className="flex">
          <div className="w-64 bg-white border-r min-h-screen hidden md:block" />
          <div className="flex-1 p-4 space-y-4">
            <div className="h-32 bg-white rounded-xl" />
            <div className="h-48 bg-white rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  // ---- モバイルタブ切り替えUI ----
  const tabs = [
    { key: 'list', label: '一覧' },
    { key: 'info', label: '情報' },
    { key: 'script', label: '台本' },
  ] as const;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* ヘッダー */}
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={() => router.back()} className="text-gray-500 text-sm">
            ← 戻る
          </button>
          <h1 className="font-bold text-base flex-1 text-black">📞 電話かけ</h1>
          {selected && (
            <span className="text-sm font-medium text-orange-600">{selected.name}</span>
          )}
        </div>
        {/* モバイルタブ */}
        <div className="flex border-t md:hidden">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`flex-1 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === t.key
                  ? 'border-orange-500 text-orange-600'
                  : 'border-transparent text-gray-500'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </header>

      <div className="flex flex-1 max-w-4xl mx-auto w-full">
        {/* 左ペイン: 担当一覧（デスクトップ常時表示、モバイルは「一覧」タブ時のみ） */}
        <aside
          className={`w-full md:w-64 bg-white border-r flex-shrink-0 overflow-y-auto ${
            activeTab !== 'list' ? 'hidden md:block' : ''
          }`}
        >
          {calls.length === 0 ? (
            <div className="p-6 text-center text-gray-400 text-sm">
              <p className="text-2xl mb-2">📋</p>
              <p>アポ獲得済みの担当新入生がいません</p>
            </div>
          ) : (
            <ul className="divide-y">
              {calls.map((c) => (
                <li key={c.id}>
                  <button
                    onClick={() => {
                      setSelectedId(c.id);
                      setActiveTab('info');
                    }}
                    className={`w-full text-left p-3 hover:bg-orange-50 transition-colors ${
                      selectedId === c.id ? 'bg-orange-50 border-l-4 border-orange-500' : ''
                    }`}
                  >
                    <div className="flex items-center gap-1 mb-1">
                      <span className="font-medium text-sm">{c.name}</span>
                      {c.alldc_flag && (
                        <span className="text-xs bg-purple-100 text-purple-700 rounded-full px-1.5">ALLDC</span>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-gray-400">入れたい度</span>
                      <ScoreBar score={c.avg_score_want_in} />
                    </div>
                    {c.latest_memo && (
                      <p className="text-xs text-gray-500 mt-1 line-clamp-1">{c.latest_memo}</p>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </aside>

        {/* 右ペイン: 情報 or 台本 */}
        <main className={`flex-1 overflow-y-auto ${activeTab === 'list' ? 'hidden md:block' : ''}`}>
          {!selected ? (
            <div className="flex items-center justify-center h-full text-gray-400 text-sm p-8">
              左のリストから新入生を選んでください
            </div>
          ) : (
            <div className="p-4 space-y-4">
              {/* 情報/台本 切り替えタブ（デスクトップ） */}
              <div className="hidden md:flex border-b">
                <button
                  onClick={() => setActiveTab('info')}
                  className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                    activeTab === 'info' ? 'border-orange-500 text-orange-600' : 'border-transparent text-gray-500'
                  }`}
                >
                  情報
                </button>
                <button
                  onClick={() => setActiveTab('script')}
                  className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                    activeTab === 'script' ? 'border-orange-500 text-orange-600' : 'border-transparent text-gray-500'
                  }`}
                >
                  台本
                </button>
              </div>

              {/* 情報タブ */}
              {activeTab === 'info' && (
                <div className="space-y-4">
                  {/* 基本情報 */}
                  <div className="bg-white rounded-xl p-4 shadow-sm">
                    <div className="flex items-center gap-2 mb-3">
                      <h2 className="text-xl font-bold">{selected.name}</h2>
                      {selected.alldc_flag && (
                        <span className="bg-purple-100 text-purple-700 text-xs font-bold px-2 py-0.5 rounded-full">ALLDC</span>
                      )}
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 mb-1">入れたい度（平均）</p>
                      <div className="flex items-center gap-2">
                        <ScoreBar score={selected.avg_score_want_in} />
                      </div>
                    </div>
                    {selected.latest_memo && (
                      <div className="mt-3">
                        <p className="text-xs text-gray-400 mb-1">最新メモ</p>
                        <p className="text-sm text-gray-700 bg-gray-50 rounded-lg p-3 whitespace-pre-wrap">
                          {selected.latest_memo}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* 電話アポ状況記録 */}
                  <div className="bg-white rounded-xl p-4 shadow-sm space-y-3">
                    <h3 className="font-semibold text-sm text-gray-700">電話アポ状況を記録</h3>

                    <div>
                      <label className="text-xs text-gray-500 block mb-1">状況</label>
                      <select
                        value={selected.apo_label ?? ''}
                        onChange={(e) => {
                          const val = e.target.value as ApoLabel | '';
                          patchSelected({ apo_label: val || null });
                        }}
                        disabled={patching}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-base text-black"
                      >
                        <option value="">選択してください</option>
                        {APO_LABELS.map((l) => (
                          <option key={l} value={l}>{l}</option>
                        ))}
                      </select>
                    </div>

                    {selected.apo_label && ['アポ獲得', '後日カフェ'].includes(selected.apo_label) && (
                      <div className="flex gap-2">
                        <div className="flex-1">
                          <label className="text-xs text-black block mb-1">日付</label>
                          <select
                            value={selected.apo_date ?? ''}
                            onChange={(e) => patchSelected({ apo_date: e.target.value || null })}
                            disabled={patching}
                            className="w-full border border-gray-200 rounded-lg px-2 py-2 text-base text-black"
                          >
                            <option value="">選択</option>
                            {APO_DATES.map((d) => (
                              <option key={d} value={d}>{d.slice(5).replace('-', '/')}</option>
                            ))}
                          </select>
                        </div>
                        <div className="flex-1">
                          <label className="text-xs text-black block mb-1">時刻</label>
                          <select
                            value={selected.apo_time ?? ''}
                            onChange={(e) => patchSelected({ apo_time: (e.target.value as ApoTime) || null })}
                            disabled={patching}
                            className="w-full border border-gray-200 rounded-lg px-2 py-2 text-base text-black"
                          >
                            <option value="">選択</option>
                            {(selected.apo_label === '後日カフェ' ? APO_TIMES_CAFE : APO_TIMES_PHONE).map((t) => (
                              <option key={t} value={t}>{t}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-1">
                      <span className="text-sm text-gray-600">決取得（入会確定）</span>
                      <button
                        onClick={() => patchSelected({ ketsu_done: !selected.ketsu_done })}
                        disabled={patching}
                        className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                          selected.ketsu_done ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-600'
                        }`}
                      >
                        {selected.ketsu_done ? '✓ 決取得！' : '未'}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* 台本タブ */}
              {activeTab === 'script' && (
                <div className="bg-white rounded-xl p-4 shadow-sm">
                  <h3 className="font-semibold text-sm text-gray-700 mb-3">電話台本</h3>
                  <pre className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed font-sans">
                    {PHONE_SCRIPT}
                  </pre>
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
