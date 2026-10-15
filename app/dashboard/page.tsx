'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

type SubmissionItem = {
  id: string | number;
  problem_id: string;
  user_draft: string;
  time_spent_seconds: number;
  ai_feedback: string;
  created_at: string;
};

type ProblemInfo = {
  id: string;
  subject: string;
  target_issue: string;
};

export default function DashboardPage() {
  const [adminQuery, setAdminQuery] = useState('');
  const [submissions, setSubmissions] = useState<SubmissionItem[]>([]);
  const [problemMap, setProblemMap] = useState<Record<string, ProblemInfo>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | number | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const admin = params.get('admin');
      if (admin) setAdminQuery(`?admin=${encodeURIComponent(admin)}`);
    }
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      // 1. 問題データの取得（科目・論点名表示用）
      const { data: problemsData } = await supabase.from('problems').select('id, subject, target_issue');
      if (problemsData) {
        const map: Record<string, ProblemInfo> = {};
        problemsData.forEach((p) => {
          map[p.id] = p;
        });
        setProblemMap(map);
      }

      // 2. 提出履歴の取得
      const { data: subData, error } = await supabase
        .from('submissions')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && subData) {
        setSubmissions(subData);
      }
    } catch (e) {
      console.warn('履歴データ取得エラー:', e);
    } finally {
      setIsLoading(false);
    }
  };

  // ★ 履歴削除ハンドラー
  const handleDeleteSubmission = async (id: string | number) => {
    const isConfirmed = window.confirm(
      'この答案履歴を削除しますか？\n※削除した起案内容やAI採点講評は復元できません。'
    );
    if (!isConfirmed) return;

    try {
      const { error } = await supabase
        .from('submissions')
        .delete()
        .eq('id', id);

      if (error) {
        throw error;
      }

      // 画面上の一覧から即座に除外
      setSubmissions((prev) => prev.filter((item) => item.id !== id));
      alert('答案履歴を削除しました。');
    } catch (err: unknown) {
      alert(`削除に失敗しました: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}分${s.toString().padStart(2, '0')}秒`;
  };

  const formatDate = (isoString: string) => {
    if (!isoString) return '';
    const d = new Date(isoString);
    return d.toLocaleString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="min-h-[calc(100vh-56px)] bg-slate-100 text-slate-800 py-6 px-4 sm:px-6 font-sans">
      <div className="max-w-5xl mx-auto space-y-4">
        
        {/* ヘッダーカード */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-xl font-black text-slate-900 flex items-center gap-2">
              📊 答案起案履歴・採点アーカイブ
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              これまでに提出された答案と考査委員AIによる厳格講評の履歴です。
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href={`/practice${adminQuery}`}
              className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition shadow-sm"
            >
              ⚖️ CBT起案室へ進む
            </Link>
          </div>
        </div>

        {/* 履歴リスト */}
        {isLoading ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-500 text-sm">
            ⏳ 答案履歴を読み込み中...
          </div>
        ) : submissions.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center space-y-3">
            <span className="text-3xl">📭</span>
            <div className="text-sm font-bold text-slate-700">起案履歴はまだありません</div>
            <p className="text-xs text-slate-500">
              起案室で答案を作成し、「🚀 答案提出・AI厳格採点」を行うとここに保存されます。
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex justify-between items-center px-1">
              <span className="text-xs font-bold text-slate-500">
                登録件数: {submissions.length}件
              </span>
            </div>

            {submissions.map((item) => {
              const prob = problemMap[item.problem_id];
              const isExpanded = expandedId === item.id;

              return (
                <div
                  key={item.id}
                  className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-3 hover:border-slate-300 transition"
                >
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-slate-100 pb-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2 py-0.5 bg-blue-50 border border-blue-200 text-blue-700 text-[11px] font-bold rounded">
                        {prob?.subject || '科目不明'}
                      </span>
                      <span className="text-xs font-bold text-slate-900">
                        {prob?.target_issue || item.problem_id}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-auto">
                      <span className="text-[11px] text-slate-400 font-mono">
                        {formatDate(item.created_at)}
                      </span>

                      {/* ★ 個別削除ボタン */}
                      <button
                        type="button"
                        onClick={() => handleDeleteSubmission(item.id)}
                        className="px-2 py-1 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 text-[11px] font-bold rounded transition flex items-center gap-1"
                        title="この履歴を削除"
                      >
                        🗑️ 削除
                      </button>
                    </div>
                  </div>

                  {/* 起案スペック情報 */}
                  <div className="flex items-center gap-4 text-xs text-slate-600 font-mono">
                    <div>
                      起案時間: <strong className="text-slate-900">{formatTime(item.time_spent_seconds || 0)}</strong>
                    </div>
                    <div>
                      文字数: <strong className="text-slate-900">{item.user_draft?.length || 0}</strong>字
                    </div>
                  </div>

                  {/* 答案本文の抜粋表示 */}
                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs text-slate-800 font-serif leading-relaxed whitespace-pre-wrap max-h-32 overflow-y-auto">
                    {item.user_draft}
                  </div>

                  {/* AI採点講評のアコーディオン */}
                  {item.ai_feedback && (
                    <div>
                      <button
                        type="button"
                        onClick={() => setExpandedId(isExpanded ? null : item.id)}
                        className="text-xs font-bold text-amber-700 hover:text-amber-800 flex items-center gap-1"
                      >
                        <span>{isExpanded ? '▼ 考査委員講評を折りたたむ' : '▶ 考査委員講評を表示する'}</span>
                      </button>

                      {isExpanded && (
                        <div className="mt-2 bg-amber-50/70 border border-amber-200 rounded-lg p-3 text-xs text-slate-800 whitespace-pre-wrap leading-relaxed animate-fadeIn">
                          {item.ai_feedback}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

      </div>
    </div>
  );
}
