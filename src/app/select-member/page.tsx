'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getMemberId, setMemberId } from '@/lib/api';

type Member = { id: string; name: string; is_phone_staff: boolean; is_leader: boolean };

export default function SelectMemberPage() {
  const router = useRouter();
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/members')
      .then((r) => r.json())
      .then((res) => {
        if (res.success) setMembers(res.data);
      })
      .finally(() => setLoading(false));
  }, [router]);

  const handleSelect = (member: Member) => {
    setMemberId(member.id);
    router.push('/dashboard');
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-gray-400">
        読み込み中...
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-8 bg-gray-50">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-bold text-center mb-2">🌸 ぽんかん2026</h1>
        <p className="text-gray-500 text-center mb-8">あなたは誰？</p>
        <div className="flex flex-col gap-3">
          {members.map((member) => (
            <button
              key={member.id}
              onClick={() => handleSelect(member)}
              className="w-full py-4 px-6 rounded-xl bg-white border-2 border-gray-200 text-left font-medium text-gray-900 hover:border-orange-400 hover:bg-orange-50 transition-colors active:scale-[0.98]"
            >
              <span className="text-lg">{member.name}</span>
              {member.is_leader && (
                <span className="ml-2 text-xs bg-orange-100 text-orange-700 rounded-full px-2 py-0.5">
                  代表
                </span>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
