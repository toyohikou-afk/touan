'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

type SubmissionHistoryItem = {
  id: string;
  created_at: string;
  time_spent_seconds: number;
  user_draft: string;
  ai_feedback: string;
  sub_problems: {
    id: string;
    subject: string;
    source_exam: string;
    target_issue: string;
  } | null;
};

export default function DashboardPage() {
  const [submissions, setSubmissions] = useState<SubmissionHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchHistory() {
      setLoading(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();

        let query = supabase
          .from('submissions')
          .select(`
            id,
            created_at,
            time_spent_seconds,
            user_draft,
            ai_feedback,
            sub_problems (
              id,
              subject,
              source_exam,
              target_issue
            )
          `)
          .order('created_at', { ascending: false });

        // ログイン中の場合はそのユーザーの答案を優先。なければ全件取得（匿名起案対応）
        if (user) {
          const { data: userSubs } = await query.eq('user_id', user.id);
          if (userSubs && userSubs.length > 0) {
            setSubmissions(userSubs as any);
            setLoading(false);
            return;
          }
        }

        // 匿名起案または全件取得
        const { data: allSubs, error } = await supabase
          .from('submissions')
          .select(`
            id,
            created_at,
            time_spent_seconds,
            user_draft,
            ai_feedback,
            sub_problems (
              id,
              subject,
              source_exam,
              target_issue
            )
          `)
          .order('created_at', { ascending: false });

        if (!error && allSubs) {
          setSubmissions(allSubs as any);
        }
      } catch (err) {
        console.error('履歴取得エラー:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchHistory();
  }, []);

  const handleRetry = (item: SubmissionHistoryItem) => {
    if (!item.sub_problems?.id) return;
    sessionStorage.setItem('retry_problem_id', item.sub_problems.id);
    sessionStorage.setItem('retry_draft', item.user_draft);
    sessionStorage.setItem('parent_submission_id', item.id);
  };

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-100 font-sans p-6 select-text">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* ヘッダー */}
        <div className="flex items-center justify-between border-b border-slate-700 pb-4">
          <div>
            <h1 className="text-xl font-black text-cyan-400 flex items-center gap-2">
              <span>🕒</span>
              <span>起案履歴・復習ダッシュボード</span>
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Supabaseに保存された過去の答案、所要時間、AI添削講評を閲覧・再起案できます。
            </p>
          </div>
          <Link
            href="/practice"
            className="px-4 py-2 bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 text-slate-950 font-black text-xs rounded-lg shadow-md transition"
          >
            ← CBT起案画面に戻る
          </Link>
        </div>

        {/* 履歴リスト */}
        {loading ? (
          <div className="py-20 text-center text-slate-400 text-sm">
            <div className="w-6 h-6 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            履歴データを取得中...
          </div>
        ) : submissions.length === 0 ? (
          <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-12 text-center space-y-3">
            <span className="text-3xl">📭</span>
            <p className="text-sm font-bold text-slate-300">保存された演習履歴がまだありません。</p>
            <p className="text-xs text-slate-400">起案画面で答案を提出すると、ここに日時とAI採点講評が蓄積されます。</p>
            <div className="pt-2">
              <Link
                href="/practice"
                className="inline-block px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs rounded-lg shadow-md transition"
              >
                新規起案を開始する
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {submissions.map((sub) => (
              <div
                key={sub.id}
                className="bg-slate-800/80 border border-slate-700 hover:border-slate-600 rounded-xl p-5 space-y-3 shadow-md transition"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-700/60 pb-2.5 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 bg-cyan-950 text-cyan-300 border border-cyan-700 rounded font-black text-[11px]">
                      {sub.sub_problems?.subject || '科目不明'}
                    </span>
                    <span className="font-extrabold text-slate-200">
                      {sub.sub_problems?.source_exam}
                    </span>
                    <span className="text-slate-400">
                      論点: <strong className="text-slate-100">{sub.sub_problems?.target_issue}</strong>
                    </span>
                  </div>

                  <div className="flex items-center gap-3 text-slate-400 text-[11px] font-mono">
                    <span>所要時間: {Math.floor((sub.time_spent_seconds || 0) / 60)}分{(sub.time_spent_seconds || 0) % 60}秒</span>
                    <span>{new Date(sub.created_at).toLocaleString('ja-JP')}</span>
                  </div>
                </div>

                <div className="grid grid-cols-12 gap-4 text-xs font-serif">
                  {/* 起案答案 */}
                  <div className="col-span-6 bg-slate-900/80 p-3.5 rounded-lg border border-slate-700/80 space-y-1.5">
                    <span className="font-sans font-black text-slate-400 text-[11px] block">◆ あなたの起案答案</span>
                    <p className="text-slate-300 whitespace-pre-wrap max-h-36 overflow-y-auto leading-relaxed">
                      {sub.user_draft}
                    </p>
                  </div>

                  {/* AI講評 */}
                  <div className="col-span-6 bg-slate-900/80 p-3.5 rounded-lg border border-slate-700/80 space-y-1.5">
                    <span className="font-sans font-black text-amber-400 text-[11px] block">◆ AI添削・採点講評</span>
                    <p className="text-slate-300 whitespace-pre-wrap max-h-36 overflow-y-auto leading-relaxed">
                      {sub.ai_feedback || '講評なし'}
                    </p>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-slate-700/50">
                  <Link
                    href="/practice"
                    onClick={() => handleRetry(sub)}
                    className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-md shadow-xs transition"
                  >
                    🔄 この答案を読み込んで再起案する
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}