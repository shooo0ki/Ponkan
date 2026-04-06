'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { getMemberId } from '@/lib/api';

type ApoLabel = 'アポ獲得' | '後日電話' | '後日カフェ' | '音信不通';

type FreshmanListItem = {
  id: string;
  name: string;
  department: string | null;
  alldc_flag: boolean;
  status_line_done: boolean;
  apo_label: ApoLabel | null;
  apo_date: string | null;
  apo_time: string | null;
  ketsu_done: boolean;
  created_at: string;
  assignees: Array<{ id: string; name: string }>;
  avg_score_want_in: number | null;
};

type FreshmanSummary = {
  total: number;
  line_done: number;
  apo_done: number;
  ketsu_done: number;
};

type Member = {
  id: string;
  name: string;
  is_phone_staff: boolean;
  is_leader: boolean;
};

type StatusFilter = 'all' | 'line_waiting' | 'apo_done' | 'ketsu_done' | 'alldc';

function StatusBadge({ item }: { item: FreshmanListItem }) {
  if (item.ketsu_done) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-green-100 text-green-800">
        決
      </span>
    );
  }
  if (item.apo_label === 'アポ獲得') {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800">
        アポ
      </span>
    );
  }
  if (item.apo_label === '後日電話') {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-yellow-100 text-yellow-800">
        後電
      </span>
    );
  }
  if (item.apo_label === '後日カフェ') {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-yellow-100 text-yellow-800">
        後カフェ
      </span>
    );
  }
  if (item.apo_label === '音信不通') {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-800">
        不通
      </span>
    );
  }
  if (!item.status_line_done) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-gray-100 text-gray-600">
        LINE待ち
      </span>
    );
  }
  // status_line_done=true でアポなし
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-orange-100 text-orange-800">
      LINE済
    </span>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const [myMemberId, setMyMemberId] = useState<string | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [summary, setSummary] = useState<FreshmanSummary | null>(null);
  const [freshmen, setFreshmen] = useState<FreshmanListItem[]>([]);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [memberFilter, setMemberFilter] = useState<string>('all'); // 'all' | 'mine' | memberId
  const [loadingFreshmen, setLoadingFreshmen] = useState(true);
  const [loadingSummary, setLoadingSummary] = useState(true);

  // メンバー認証チェック & 初期データ取得
  useEffect(() => {
    const id = getMemberId();
    if (!id) {
      router.replace('/select-member');
      return;
    }
    setMyMemberId(id);

    // メンバー一覧 + サマリーを並列取得
    Promise.all([
      fetch('/api/members').then((r) => r.json()),
      fetch('/api/freshmen/summary').then((r) => r.json()),
    ])
      .then(([membersRes, summaryRes]) => {
        if (membersRes.success) setMembers(membersRes.data);
        if (summaryRes.success) setSummary(summaryRes.data);
      })
      .finally(() => setLoadingSummary(false));
  }, [router]);

  // 新入生一覧取得
  const fetchFreshmen = useCallback(() => {
    const params = new URLSearchParams();
    if (statusFilter !== 'all') {
      params.set('status', statusFilter);
    }
    // 担当者フィルタ
    if (memberFilter === 'mine' && myMemberId) {
      params.set('member_id', myMemberId);
    } else if (memberFilter !== 'all' && memberFilter !== 'mine') {
      params.set('member_id', memberFilter);
    }

    const url = `/api/freshmen${params.toString() ? `?${params.toString()}` : ''}`;
    setLoadingFreshmen(true);
    fetch(url)
      .then((r) => r.json())
      .then((res) => {
        if (res.success) setFreshmen(res.data);
      })
      .finally(() => setLoadingFreshmen(false));
  }, [statusFilter, memberFilter, myMemberId]);

  useEffect(() => {
    if (!myMemberId) return;
    fetchFreshmen();
  }, [fetchFreshmen, myMemberId]);

  const myName = members.find((m) => m.id === myMemberId)?.name ?? '';

  const statusTabs: { key: StatusFilter; label: string }[] = [
    { key: 'all', label: '全員' },
    { key: 'line_waiting', label: 'LINE待ち' },
    { key: 'apo_done', label: 'アポ済' },
    { key: 'ketsu_done', label: '決取得' },
    { key: 'alldc', label: 'ALLDC' },
  ];

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <header className="sticky top-0 z-10 bg-white border-b border-gray-200 shadow-sm">
        <div className="flex items-center justify-between px-4 py-3">
          <h1 className="text-lg font-bold text-gray-900">🌸 ぽんかん2026</h1>
          <div className="flex items-center gap-2">
            {myName && (
              <span className="text-sm text-gray-600 font-medium">{myName}</span>
            )}
            <button
              onClick={() => router.push('/select-member')}
              className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-600 px-3 py-1.5 rounded-full transition-colors"
            >
              切り替え
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 px-4 py-4 max-w-2xl mx-auto w-full">
        {/* 進捗カード */}
        <section className="mb-5">
          {loadingSummary ? (
            <div className="grid grid-cols-4 gap-2">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-20 rounded-xl bg-gray-200 animate-pulse" />
              ))}
            </div>
          ) : summary ? (
            <div className="grid grid-cols-4 gap-2">
              <div className="flex flex-col items-center justify-center bg-orange-50 border border-orange-200 rounded-xl p-2">
                <span className="text-2xl font-bold text-orange-600">{summary.total}</span>
                <span className="text-xs text-orange-500 mt-0.5 text-center leading-tight">来訪</span>
              </div>
              <div className="flex flex-col items-center justify-center bg-sky-50 border border-sky-200 rounded-xl p-2">
                <span className="text-2xl font-bold text-sky-600">{summary.line_done}</span>
                <span className="text-xs text-sky-500 mt-0.5 text-center leading-tight">LINE済</span>
              </div>
              <div className="flex flex-col items-center justify-center bg-blue-50 border border-blue-200 rounded-xl p-2">
                <span className="text-2xl font-bold text-blue-600">{summary.apo_done}</span>
                <span className="text-xs text-blue-500 mt-0.5 text-center leading-tight">アポ済</span>
              </div>
              <div className="flex flex-col items-center justify-center bg-green-50 border border-green-200 rounded-xl p-2">
                <span className="text-2xl font-bold text-green-600">{summary.ketsu_done}</span>
                <span className="text-xs text-green-500 mt-0.5 text-center leading-tight">決取得</span>
              </div>
            </div>
          ) : null}
        </section>

        {/* ステータスフィルタータブ */}
        <div className="overflow-x-auto -mx-4 px-4 mb-3">
          <div className="flex gap-2 w-max">
            {statusTabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setStatusFilter(tab.key)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                  statusFilter === tab.key
                    ? 'bg-orange-500 text-white'
                    : 'bg-white text-gray-600 border border-gray-200 hover:border-orange-300 hover:text-orange-600'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* 担当者フィルター */}
        <div className="mb-4">
          <select
            value={memberFilter}
            onChange={(e) => setMemberFilter(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-base bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-orange-300"
          >
            <option value="all">全員</option>
            <option value="mine">自分（{members.find((m) => m.id === myMemberId)?.name ?? ''}）</option>
            {members
              .filter((m) => m.id !== myMemberId)
              .map((m) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
          </select>
        </div>

        {/* 新入生一覧 */}
        <section>
          {loadingFreshmen ? (
            <div className="flex flex-col gap-2">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-16 rounded-xl bg-gray-200 animate-pulse" />
              ))}
            </div>
          ) : freshmen.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
              <span className="text-4xl mb-2">🌸</span>
              <p className="text-sm">該当する新入生はいません</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {freshmen.map((item) => (
                <button
                  key={item.id}
                  onClick={() => router.push(`/freshmen/${item.id}`)}
                  className="w-full text-left bg-white rounded-xl border border-gray-200 px-4 py-3 hover:border-orange-300 hover:bg-orange-50 transition-colors active:scale-[0.99]"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <span className="font-semibold text-black truncate">{item.name}</span>
                      {item.department && (
                        <span className="text-xs text-gray-400 truncate hidden sm:inline">
                          {item.department}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {item.alldc_flag && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-800">
                          ALLDC
                        </span>
                      )}
                      <StatusBadge item={item} />
                    </div>
                  </div>
                  {item.assignees.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {item.assignees.map((a) => (
                        <span
                          key={a.id}
                          className={`text-xs px-2 py-0.5 rounded-full ${
                            a.id === myMemberId
                              ? 'bg-orange-100 text-orange-700'
                              : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {a.name}
                        </span>
                      ))}
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}
        </section>
      </main>

      {/* FAB */}
      <button
        onClick={() => router.push('/freshmen/new')}
        className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-orange-500 hover:bg-orange-600 text-white shadow-lg flex items-center justify-center text-2xl font-light transition-colors active:scale-95 z-20"
        aria-label="新入生を追加"
      >
        ＋
      </button>
    </div>
  );
}
