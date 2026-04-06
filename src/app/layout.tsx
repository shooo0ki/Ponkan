import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'ぽんかん新歓管理',
  description: 'ぽんかん2026 新歓管理アプリ',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja" className="h-full">
      <body className="min-h-full bg-gray-50 text-gray-900">{children}</body>
    </html>
  );
}
