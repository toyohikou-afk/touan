import type { Metadata } from 'next';
import './globals.css';
import { Navbar } from '../components/Navbar';

export const metadata: Metadata = {
  title: '予備試験・司法試験 刑法ラボ',
  description: '答案直結の論点暗記カード & 実戦起案ドリル',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body className="bg-slate-100 min-h-screen antialiased">
        <Navbar />
        <main>{children}</main>
      </body>
    </html>
  );
}
