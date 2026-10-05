'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

type SubmissionItem = {
  id: string;
  problem_id: string;
  user_draft: string;
  time_spent_seconds: number;
  ai_feedback: string;
  created_at: string;
  sub_problems?: {
    subject?: string;
    source_exam?: string;
    target_issue?: string;
  };
};

export default function DashboardPage() {
  const [submissions, setSubmissions] = useState<SubmissionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // 履歴一覧取得
  const fetchSubmissions = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('submissions')
        .select(`
          id,
          problem_id,
          user_draft,
          time_spent_seconds,
          ai_feedback,
          created_at,
          sub_problems (
            subject,
            source_exam,
            target_issue
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSubmissions((data as any) || []);
    } catch (err: any) {
      console.error('履歴取得失敗:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubmissions();
  }, []);

  // 履歴削除処理
  const handleDelete = async (id: string) => {
    if (!confirm('この起案履歴を削除しますか？\n※削除した答案は元に戻せません。')) return;

    try {
      setDeletingId(id);
      const { error } = await supabase.from('submissions').delete().eq('id', id);

      if (error) throw error;

      // 画面の状態を即座に更新
      setSubmissions((prev) => prev.filter((item) => item.id !== id));
      alert('履歴を削除しました。');
    } catch (err: any) {
      alert('削除エラー: ' + (err.message || '削除に失敗しました'));
    } finally {
      setDeletingId(null);
    }
  };

  // 再起案（practiceへデータ引き継ぎ）
  const handleRetry = (problemId: string, draft: string) => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('retry_problem_id', problemId);
      sessionStorage.setItem('retry_draft', draft);
    }
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f1f5f9', color: '#0f172a', fontFamily: 'sans-serif', padding: '24px 16px' }}>
      <div style={{ maxWidth: '960px', margin: '0 auto' }}>
        
        {/* ヘッダーエリア */}
        <header
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            backgroundColor: '#ffffff',
            padding: '16px 24px',
            borderRadius: '12px',
            border: '1px solid #cbd5e1',
            marginBottom: '20px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.04)',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '20px' }}>📋</span>
              <h1 style={{ margin: 0, fontSize: '18px', fontWeight: 'bold', color: '#0f172a' }}>
                起案・添削履歴一覧
              </h1>
              <span style={{ fontSize: '12px', backgroundColor: '#e2e8f0', color: '#475569', padding: '2px 8px', borderRadius: '12px', fontWeight: 'bold' }}>
                {submissions.length} 件
              </span>
            </div>
            <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#64748b' }}>
              これまでに提出した答案の管理、AI採点講評の復習、答案の再起案ができます
            </p>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <Link
              href="/practice"
              style={{
                padding: '8px 16px',
                backgroundColor: '#0284c7',
                color: '#ffffff',
                fontSize: '12px',
                fontWeight: 'bold',
                borderRadius: '6px',
                textDecoration: 'none',
                boxShadow: '0 2px 4px rgba(2,132,199,0.3)',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              ✍️️ CBT起案室へ戻る
            </Link>
          </div>
        </header>

        {/* メインコンテンツ */}
        {loading ? (
          <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', padding: '48px', textAlign: 'center', color: '#64748b', border: '1px solid #cbd5e1', fontWeight: 'bold' }}>
            履歴を読み込み中...
          </div>
        ) : submissions.length === 0 ? (
          <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', padding: '48px', textAlign: 'center', color: '#64748b', border: '1px solid #cbd5e1' }}>
            <p style={{ fontSize: '15px', fontWeight: 'bold', margin: '0 0 12px', color: '#334155' }}>
              提出済みの起案履歴がありません。
            </p>
            <Link
              href="/practice"
              style={{
                display: 'inline-block',
                padding: '9px 18px',
                backgroundColor: '#0284c7',
                color: '#ffffff',
                fontSize: '13px',
                fontWeight: 'bold',
                borderRadius: '6px',
                textDecoration: 'none',
              }}
            >
              最初の起案を始める →
            </Link>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {submissions.map((sub) => {
              const minutes = Math.floor(sub.time_spent_seconds / 60);
              const dateStr = new Date(sub.created_at).toLocaleString('ja-JP');
              const isDeleting = deletingId === sub.id;

              return (
                <div
                  key={sub.id}
                  style={{
                    backgroundColor: '#ffffff',
                    borderRadius: '12px',
                    border: '1px solid #cbd5e1',
                    padding: '20px',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
                    position: 'relative',
                  }}
                >
                  {/* カード上部情報バー */}
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      borderBottom: '1px solid #e2e8f0',
                      paddingBottom: '12px',
                      marginBottom: '14px',
                      flexWrap: 'wrap',
                      gap: '12px',
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                        <span style={{ backgroundColor: '#e0f2fe', color: '#0369a1', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold' }}>
                          {sub.sub_problems?.subject || '民法'}
                        </span>
                        <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#475569' }}>
                          {sub.sub_problems?.source_exam || '予備試験'}
                        </span>
                        <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                          📅 {dateStr}
                        </span>
                      </div>
                      <h2 style={{ margin: 0, fontSize: '15px', fontWeight: 'bold', color: '#0f172a' }}>
                        論点: {sub.sub_problems?.target_issue || '民法総合'}
                      </h2>
                    </div>

                    {/* 操作ボタン群（右上に常時表示） */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '12px', color: '#475569', fontWeight: 'bold', backgroundColor: '#f8fafc', padding: '4px 8px', borderRadius: '4px', border: '1px solid #e2e8f0' }}>
                        ⏱ {minutes}分
                      </span>

                      {/* 再起案ボタン */}
                      <Link
                        href="/practice"
                        onClick={() => handleRetry(sub.problem_id, sub.user_draft)}
                        style={{
                          padding: '6px 12px',
                          backgroundColor: '#f1f5f9',
                          border: '1px solid #cbd5e1',
                          color: '#0f172a',
                          fontSize: '12px',
                          fontWeight: 'bold',
                          borderRadius: '6px',
                          textDecoration: 'none',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        🔄 再起案
                      </Link>

                      {/* 🗑️ 削除ボタン（赤色で明確化） */}
                      <button
                        type="button"
                        onClick={() => handleDelete(sub.id)}
                        disabled={isDeleting}
                        style={{
                          padding: '6px 12px',
                          backgroundColor: '#fee2e2',
                          border: '1px solid #f87171',
                          color: '#b91c1c',
                          fontSize: '12px',
                          fontWeight: 'bold',
                          borderRadius: '6px',
                          cursor: isDeleting ? 'not-allowed' : 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          boxShadow: '0 1px 2px rgba(220, 38, 38, 0.1)',
                        }}
                      >
                        {isDeleting ? '削除中...' : '🗑️ 削除'}
                      </button>
                    </div>
                  </div>

                  {/* 答案本文 ＆ AI採点講評（2列レイアウト） */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
                    {/* 提出答案 */}
                    <div style={{ backgroundColor: '#f8fafc', padding: '14px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                        <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#475569' }}>
                          📝 あなたの提出答案
                        </span>
                        <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 'bold' }}>
                          {sub.user_draft.length} 文字 (約 {(sub.user_draft.length / 690).toFixed(1)} 頁)
                        </span>
                      </div>
                      <pre style={{ margin: 0, fontSize: '12px', lineHeight: '1.6', fontFamily: 'serif', whiteSpace: 'pre-wrap', maxHeight: '200px', overflowY: 'auto', color: '#1e293b' }}>
                        {sub.user_draft}
                      </pre>
                    </div>

                    {/* AI採点・添削講評 */}
                    <div style={{ backgroundColor: '#fffbeb', padding: '14px', borderRadius: '8px', border: '1px solid #fde68a' }}>
                      <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#92400e', marginBottom: '6px' }}>
                        ⚖️ AI採点・添削講評
                      </div>
                      <div style={{ fontSize: '12px', lineHeight: '1.6', whiteSpace: 'pre-wrap', maxHeight: '200px', overflowY: 'auto', color: '#78350f' }}>
                        {sub.ai_feedback || '講評データなし'}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

      </div>
    </div>
  );
}