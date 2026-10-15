'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export function Navbar() {
  const pathname = usePathname();
  const [adminQuery, setAdminQuery] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const admin = params.get('admin');
      if (admin) {
        setAdminQuery(`?admin=${encodeURIComponent(admin)}`);
      }
    }
  }, []);

  const navItems = [
    { label: '📝 刑法起案ドリル', href: `/drill${adminQuery}` },
    { label: '📇 規範・論点暗記カード', href: `/anki${adminQuery}` },
    { label: '⚖️ CBT本番起案室', href: `/practice${adminQuery}` },
  ];

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href={`/drill${adminQuery}`} className="flex items-center gap-2 group">
            <span className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-black text-sm shadow-sm group-hover:bg-blue-700 transition">
              予
            </span>
            <span className="font-bold text-slate-900 text-sm hidden sm:inline">
              予備試験・司法試験ラボ
            </span>
          </Link>

          <nav className="flex items-center gap-1 sm:gap-2">
            {navItems.map((item) => {
              const isActive = pathname.startsWith(item.href.split('?')[0]);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                    isActive
                      ? 'bg-blue-50 text-blue-700 border border-blue-200'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div>
          {adminQuery ? (
            <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 text-[11px] font-bold rounded-full border border-emerald-300 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              管理者モード中
            </span>
          ) : (
            <span className="text-[11px] text-slate-400 font-medium hidden sm:inline">
              閲覧専用モード
            </span>
          )}
        </div>
      </div>
    </header>
  );
}
