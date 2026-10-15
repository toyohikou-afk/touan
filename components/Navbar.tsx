'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';

export default function Navbar() {
  const [adminQuery, setAdminQuery] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const admin = params.get('admin');
      if (admin) setAdminQuery(`?admin=${encodeURIComponent(admin)}`);
    }
  }, []);

  return (
    <nav className="h-14 bg-slate-900 text-white flex items-center justify-between px-4 sm:px-6 shadow-md border-b border-slate-800 shrink-0 sticky top-0 z-50">
      <div className="flex items-center gap-3">
        {/* ★ 論証アプリへの直通戻るボタン（最優先・目立つアンバー表示） */}
        <a
          href="https://yobi-ronsho-app.vercel.app/"
          className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-lg transition shadow-sm shrink-0"
        >
          <span>←</span>
          <span>📇 論証アプリへ戻る</span>
        </a>

        <Link href={`/practice${adminQuery}`} className="text-sm font-bold text-slate-200 hover:text-white hidden sm:inline">
          CBT起案シミュレーター
        </Link>
      </div>

      <div className="flex items-center gap-2 sm:gap-3 text-xs font-bold">
        <Link
          href={`/practice${adminQuery}`}
          className="px-2.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white transition"
        >
          ⚖️ 起案室
        </Link>
        <Link
          href={`/drill${adminQuery}`}
          className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition"
        >
          📝 ドリル
        </Link>
        <Link
          href={`/anki${adminQuery}`}
          className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition"
        >
          📇 暗記
        </Link>
        <Link
          href={`/dashboard${adminQuery}`}
          className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition"
        >
          📊 履歴
        </Link>
      </div>
    </nav>
  );
}
