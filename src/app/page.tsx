'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getMemberId } from '@/lib/api';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const memberId = getMemberId();
    if (memberId) {
      router.replace('/dashboard');
    } else {
      router.replace('/select-member');
    }
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-gray-400 text-sm">読み込み中...</div>
    </div>
  );
}
