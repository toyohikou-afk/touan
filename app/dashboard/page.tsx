'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

interface Submission {
  id: string;
  problem_id: string;
  user_draft: string;
  time_spent_seconds: number;
  ai_feedback: string | null;
  created_at: string;
  subject?: string;
}

type SortOption = 'date_desc' | 'date_asc' | 'chars_desc' | 'chars_asc' | 'time_desc' | 'time_asc';

export default function DashboardPage() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [adminQuery, setAdminQuery] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [searchKeyword, setSearchKeyword] = useState('');
  const [selectedSubject, setSelectedSubject] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<SortOption>('date_desc');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const admin = params.get('admin');
      if (admin) {
        setAdminQuery(`?admin=${encodeURIComponent(admin)}`);
        setIsAdmin(true);
      }
    }
    fetchSubmissions();
  }, []);

  const fetchSubmissions = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('submissions')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('履歴取得エラー:', error.message);
    } else if (data) {
      setSubmissions(data);
      if (data.length > 0 && !selectedId) {
        setSelectedId(data[0].id);
      }
    }
    setLoading(false);
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isAdmin) return;
    if (!confirm('この起案履歴を削除しますか？\n（復元はできません）')) return;

    setDeletingId(id);
    try {
      const res = await fetch(`/api/submissions${adminQuery}&id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || '削除に失敗しました');

      alert('起案履歴を削除しました。');
      const updated = submissions.filter((s) => s.id !== id);
      setSubmissions(updated);
      if (selectedId === id) {
        setSelectedId(updated[0]?.id || null);
      }
    } catch (err: unknown) {
      alert(`削除エラー: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setDeletingId(null);
    }
  };

  const detectSubject = (item: Submission): string => {
    if (item.subject) return item.subject;
    const combined = `${item.user_draft} ${item.ai_feedback || ''}`;
    if (combined.includes('刑法') || combined.includes('罪責') || combined.includes('強盗') || combined.includes('共同正犯')) return '刑法';
    if (combined.includes('民法') || combined.includes('契約') || combined.includes('請求') || combined.includes('不法行為')) return '民法';
    if (combined.includes('憲法') || combined.includes('法令違憲') || combined.includes('違憲') || combined.includes('表現の自由')) return '憲法';
    if (combined.includes('刑訴') || combined.includes('伝聞') || combined.includes('令状') || combined.includes('逮捕')) return '刑事訴訟法';
    return 'その他';
  };

  const filteredSubmissions = useMemo(() => {
    return submissions
      .filter((item) => {
        const itemSubject = detectSubject(item);
        if (selectedSubject !== 'ALL' && itemSubject !== selectedSubject) {
          return false;
        }

        const q = searchKeyword.trim().toLowerCase();
        if (!q) return true;

        const draftMatch = item.user_draft.toLowerCase().includes(q);
        const feedbackMatch = (item.ai_feedback || '').toLowerCase().includes(q);
        return draftMatch || feedbackMatch;
      })
      .sort((a, b) => {
        switch (sortBy) {
          case 'date_desc':
            return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
          case 'date_asc':
            return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          case 'chars_desc':
            return b.user_draft.length - a.user_draft.length;
          case 'chars_asc':
            return a.user_draft.length - b.user_draft.length;
          case 'time_desc':
            return (b.time_spent_seconds || 0) - (a.time_spent_seconds || 0);
          case 'time_asc':
            return (a.time_spent_seconds || 0) - (b.time_spent_seconds || 0);
          default:
            return 0;
        }
      });
  }, [submissions, searchKeyword, selectedSubject, sortBy]);

  useEffect(() => {
    if (filteredSubmissions.length > 0) {
      const exists = filteredSubmissions.some((s) => s.id === selectedId);
      if (!exists) {
        setSelectedId(filteredSubmissions[0].id);
      }
    } else {
      setSelectedId(null);
    }
  }, [filteredSubmissions, selectedId]);

  const resetFilters = () => {
    setSearchKeyword('');
    setSelectedSubject('ALL');
    setSortBy('date_desc');
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatSeconds = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}分${s.toString().padStart(2, '0')}秒`;
  };

  const activeSubmission = submissions.find((s) => s.id === selectedId);

  return (
    <div className="min-h-[calc(100vh-56px)] bg-slate-100 py-6 px-4 sm:px-6 lg:px-8 text-slate-800">
      <div className="max-w-7xl mx-auto space-y-5">
        
        {/* ヘッダー（戻るボタン群を設置） */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-200 gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 flex items-center gap-2">
              📊 CBT起案・AI採点 履歴一覧
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              蓄積された過去の起案答案と考査委員の添削講評を横断検索・比較検討できます。
            </p>
          </div>

          {/* 各演習画面へ戻るボタン群 */}
          <div className="flex items-center gap-2 flex-wrap">
            <Link
              href={`/practice${adminQuery}`}
              className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-sm transition flex items-center gap-1.5"
            >
              ⚖️ CBT起案室へ戻る
            </Link>
            <Link
              href={`/drill${adminQuery}`}
              className="px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 text-xs font-bold rounded-lg shadow-sm transition"
            >
              📝 ドリルへ
            </Link>
            <Link
              href={`/anki${adminQuery}`}
              className="px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 text-xs font-bold rounded-lg shadow-sm transition"
            >
              📇 暗記カードへ
            </Link>
          </div>
        </div>

        {/* 検索・絞り込みフィルターパネル */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
            <div className="md:col-span-6 relative">
              <input
                type="text"
                placeholder="論点・キーワード・条文・講評内容を検索 (例: 強盗, 離脱, 240条, 三段論法)"
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                className="w-full pl-9 pr-8 py-2 text-xs border border-slate-300 rounded-lg bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
              />
              <span className="absolute left-3 top-2.5 text-slate-400 text-xs">🔍</span>
              {searchKeyword && (
                <button
                  type="button"
                  onClick={() => setSearchKeyword('')}
                  className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600 text-xs p-0.5"
                >
                  ✕
                </button>
              )}
            </div>

            <div className="md:col-span-4 flex items-center gap-2">
              <span className="text-xs font-bold text-slate-500 shrink-0">並替:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="w-full py-2 px-2.5 text-xs border border-slate-300 rounded-lg bg-slate-50 font-medium text-slate-700 focus:outline-none focus:border-blue-500"
              >
                <option value="date_desc">提出日時が新しい順</option>
                <option value="date_asc">提出日時が古い順</option>
                <option value="chars_desc">文字数が多い順</option>
                <option value="chars_asc">文字数が少ない順</option>
                <option value="time_desc">起案時間が長い順</option>
                <option value="time_asc">起案時間が短い順</option>
              </select>
            </div>

            <div className="md:col-span-2 flex justify-end">
              {(searchKeyword || selectedSubject !== 'ALL' || sortBy !== 'date_desc') && (
                <button
                  type="button"
                  onClick={resetFilters}
                  className="text-xs text-blue-600 hover:text-blue-800 font-bold hover:underline"
                >
                  条件をクリア
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2 border-t border-slate-100 flex-wrap">
            <span className="text-xs font-bold text-slate-500 mr-1">科目:</span>
            {['ALL', '刑法', '民法', '憲法', '刑事訴訟法'].map((sub) => {
              const isSelected = selectedSubject === sub;
              return (
                <button
                  key={sub}
                  type="button"
                  onClick={() => setSelectedSubject(sub)}
                  className={`px-3 py-1 rounded-full text-xs font-bold transition border ${
                    isSelected
                      ? 'bg-blue-600 border-blue-600 text-white shadow-sm'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {sub === 'ALL' ? '全科目' : sub}
                </button>
              );
            })}

            <div className="ml-auto text-xs text-slate-500">
              表示: <strong className="text-slate-800">{filteredSubmissions.length}</strong> / {submissions.length} 件
            </div>
          </div>
        </div>

        {/* リスト表示 */}
        {loading ? (
          <div className="p-16 text-center text-slate-500 text-sm">
            答案履歴を読み込み中...
          </div>
        ) : submissions.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center space-y-4 shadow-sm">
            <span className="text-4xl block">📝</span>
            <h2 className="text-base font-bold text-slate-700">提出された答案履歴がまだありません</h2>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              CBT本番起案室（/practice）で答案を作成し、「🚀 答案提出・AI厳格採点」を実行すると、ここに自動保存されます。
            </p>
            <Link
              href={`/practice${adminQuery}`}
              className="inline-block mt-2 px-5 py-2.5 bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-blue-700 transition"
            >
              CBT起案室へ進む
            </Link>
          </div>
        ) : filteredSubmissions.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center space-y-3 shadow-sm">
            <span className="text-3xl block">🔍</span>
            <h3 className="text-sm font-bold text-slate-800">条件に一致する答案が見つかりませんでした</h3>
            <p className="text-xs text-slate-500">検索キーワードを変更するか、フィルターをリセットしてください。</p>
            <button
              type="button"
              onClick={resetFilters}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition"
            >
              検索条件をすべてクリア
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            <div className="lg:col-span-4 space-y-3 max-h-[calc(100vh-250px)] overflow-y-auto pr-1">
              {filteredSubmissions.map((item, idx) => {
                const isSelected = item.id === selectedId;
                const sub = detectSubject(item);
                return (
                  <div
                    key={item.id}
                    onClick={() => setSelectedId(item.id)}
                    className={`p-4 rounded-xl border transition cursor-pointer relative shadow-sm ${
                      isSelected
                        ? 'bg-blue-50/70 border-blue-500 ring-2 ring-blue-400/20'
                        : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1.5">
                      <div className="flex items-center gap-1.5">
                        <span className="px-1.5 py-0.5 bg-blue-100 text-blue-800 rounded font-bold text-[10px]">
                          {sub}
                        </span>
                        <span className="font-bold text-slate-700">#{filteredSubmissions.length - idx}</span>
                      </div>
                      <span>{formatDate(item.created_at)}</span>
                    </div>

                    <div className="text-xs font-bold text-slate-900 mb-2 line-clamp-1">
                      {item.user_draft.trim().split('\n')[0] || '無題の起案'}
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-100">
                      <div className="flex items-center gap-2">
                        <span>⏱ {formatSeconds(item.time_spent_seconds)}</span>
                        <span>・</span>
                        <span>{item.user_draft.length}字</span>
                      </div>

                      {isAdmin && (
                        <button
                          type="button"
                          onClick={(e) => handleDelete(item.id, e)}
                          disabled={deletingId === item.id}
                          className="text-[10px] text-rose-600 hover:text-rose-800 font-bold px-2 py-0.5 rounded hover:bg-rose-50 border border-transparent hover:border-rose-200 transition"
                        >
                          {deletingId === item.id ? '削除中' : '削除'}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="lg:col-span-8 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
              {activeSubmission ? (
                <>
                  <div className="flex flex-wrap items-center justify-between pb-4 border-b border-slate-200 gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded font-bold text-xs">
                          {detectSubject(activeSubmission)}
                        </span>
                        <div className="text-sm font-bold text-slate-900">{formatDate(activeSubmission.created_at)}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 text-xs">
                      <div className="bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
                        <span className="text-slate-500">起案所要時間: </span>
                        <strong className="text-slate-800 font-mono">{formatSeconds(activeSubmission.time_spent_seconds)}</strong>
                      </div>
                      <div className="bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
                        <span className="text-slate-500">文字数: </span>
                        <strong className="text-slate-800 font-mono">{activeSubmission.user_draft.length} 字</strong>
                        <span className="text-slate-400 text-[11px]"> (約 {(activeSubmission.user_draft.length / 690).toFixed(1)} 頁)</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h3 className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                      <span className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded border border-amber-300">
                        ⚖️ 考査委員の採点講評（Gemini 3.8 Flash）
                      </span>
                    </h3>
                    <div className="bg-amber-50/50 border border-amber-200 rounded-xl p-5 text-xs sm:text-sm leading-relaxed text-slate-800 whitespace-pre-wrap font-sans">
                      {activeSubmission.ai_feedback || '講評データがありません。'}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h3 className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                      <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded border border-slate-300">
                        ✍️ 提出答案本文
                      </span>
                    </h3>
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 text-xs sm:text-sm leading-relaxed text-slate-900 whitespace-pre-wrap font-serif min-h-[220px]">
                      {activeSubmission.user_draft}
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center text-slate-400 py-20 text-xs">
                  左側のリストから履歴を選択してください
                </div>
              )}
            </div>

          </div>
        )}

      </div>
    </div>
  );
}
