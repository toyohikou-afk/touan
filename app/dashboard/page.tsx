'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

type SubmissionItem = {
  id: string;
  created_at: string;
  time_spent_seconds: number;
  user_draft: string;
  ai_feedback: string;
  problem_id: string;
  problem_subject?: string;
  problem_title?: string;
  problem_issue?: string;
};

export default function DashboardPage() {
  const [submissions, setSubmissions] = useState<SubmissionItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      try {
        setLoading(true);

        // 1. submissions を取得
        const { data: subsData, error: subsError } = await supabase
          .from('submissions')
          .select('*')
          .order('created_at', { ascending: false });

        if (subsError) {
          console.warn('Submissions取得エラー:', subsError);
        }

        // 2. 関連する問題情報（sub_problems）を安全に個別マッピング
        const items = subsData || [];
        if (items.length > 0) {
          const { data: probData } = await supabase
            .from('sub_problems')
            .select('id, subject, source_exam, target_issue');

          const probMap = new Map();
          if (probData) {
            probData.forEach((p) => probMap.set(p.id, p));
          }

          const combined: SubmissionItem[] = items.map((sub: any) => {
            const prob = probMap.get(sub.problem_id);
            return {
              ...sub,
              problem_subject: prob?.subject || '民法',
              problem_title: prob?.source_exam || '予備試験 演習問題',
              problem_issue: prob?.target_issue || '94条2項類推適用と第三者',
            };
          });

          if (isMounted) setSubmissions(combined);
        } else {
          if (isMounted) setSubmissions([]);
        }
      } catch (err) {
        console.error('ダッシュボード読み込みエラー:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadData();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleRetry = (item: SubmissionItem) => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('retry_problem_id', item.problem_id);
      sessionStorage.setItem('retry_draft', item.user_draft);
      sessionStorage.setItem('parent_submission_id', item.id);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 font-sans select-text">
      
      {/* ヘッダーバー */}
      <header className="h-14 bg-[#1e293b] text-white px-6 flex items-center justify-between border-b-2 border-cyan-500 shadow-md">
        <div className="flex items-center gap-3">
          <span className="text-xl">🕒</span>
          <div>
            <h1 className="text-sm font-black tracking-wider text-cyan-300">
              起案履歴・復習ダッシュボード
            </h1>
            <p className="text-[11px] text-slate-300">
              過去の提出答案・所要時間・AI添削講評を閲覧し、再起案できます
            </p>
          </div>
        </div>

        <Link
          href="/practice"
          className="px-4 py-1.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-xs rounded shadow-md transition"
        >
          ← CBT起案画面に戻る
        </Link>
      </header>

      {/* メインコンテンツ */}
      <main className="max-w-6xl mx-auto p-6 space-y-6">
        
        {loading ? (
          <div className="py-24 text-center text-slate-600 space-y-3">
            <div className="w-8 h-8 border-3 border-cyan-600 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs font-bold">起案履歴を読み込み中...</p>
          </div>
        ) : submissions.length === 0 ? (
          <div className="bg-white rounded-xl border-2 border-slate-300 p-12 text-center shadow-sm space-y-4">
            <div className="w-16 h-16 bg-slate-100 text-slate-400 text-3xl rounded-full flex items-center justify-center mx-auto">
              📭
            </div>
            <div className="space-y-1">
              <h2 className="text-base font-black text-slate-800">
                保存された起案履歴がまだありません
              </h2>
              <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                先ほどのデータベース再構築により履歴が初期化されています。起案画面で答案を提出すると、ここに日時・所要時間・AI採点講評が自動で蓄積されます。
              </p>
            </div>

            <div className="pt-2">
              <Link
                href="/practice"
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-black text-xs rounded-lg shadow-md transition"
              >
                <span>✍️ 最初の問題を起案してみる</span>
                <span>➔</span>
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between text-xs text-slate-600 font-bold px-1">
              <span>全 {submissions.length} 件の起案履歴</span>
              <span>最新順</span>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {submissions.map((sub) => (
                <div
                  key={sub.id}
                  className="bg-white rounded-xl border-2 border-slate-300 hover:border-cyan-600 p-5 shadow-sm space-y-4 transition"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-3 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 bg-cyan-100 text-cyan-950 border border-cyan-300 rounded font-black text-[11px]">
                        {sub.problem_subject}
                      </span>
                      <span className="font-extrabold text-slate-900 text-sm">
                        {sub.problem_title}
                      </span>
                      <span className="text-slate-600">
                        論点: <strong className="text-slate-900">{sub.problem_issue}</strong>
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-slate-600 font-mono text-[11px]">
                      <span>⏱ 所要時間: {Math.floor((sub.time_spent_seconds || 0) / 60)}分{(sub.time_spent_seconds || 0) % 60}秒</span>
                      <span>📅 {new Date(sub.created_at).toLocaleString('ja-JP')}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-12 gap-4 text-xs font-serif">
                    {/* あなたの起案答案 */}
                    <div className="col-span-6 bg-slate-50 p-4 rounded-lg border border-slate-300 space-y-2">
                      <div className="flex items-center justify-between font-sans border-b pb-1.5">
                        <span className="font-black text-slate-800 text-xs flex items-center gap-1.5">
                          <span>📝</span>
                          <span>あなたの起案答案</span>
                        </span>
                        <span className="text-[11px] text-slate-500 font-mono">
                          {sub.user_draft?.length || 0} 字
                        </span>
                      </div>
                      <p className="text-slate-800 whitespace-pre-wrap max-h-44 overflow-y-auto leading-relaxed select-text">
                        {sub.user_draft}
                      </p>
                    </div>

                    {/* AI添削講評 */}
                    <div className="col-span-6 bg-amber-50/60 p-4 rounded-lg border border-amber-300 space-y-2">
                      <div className="flex items-center justify-between font-sans border-b border-amber-200 pb-1.5">
                        <span className="font-black text-amber-950 text-xs flex items-center gap-1.5">
                          <span>⚖</span>
                          <span>AI添削・採点講評</span>
                        </span>
                      </div>
                      <p className="text-slate-800 whitespace-pre-wrap max-h-44 overflow-y-auto leading-relaxed select-text">
                        {sub.ai_feedback || '講評なし'}
                      </p>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
                    <Link
                      href="/practice"
                      onClick={() => handleRetry(sub)}
                      className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-md shadow-xs transition"
                    >
                      🔄 この答案を読み込んで再起案する
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </main>
    </div>
  );
}