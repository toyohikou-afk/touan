'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

type SubmissionItem = {
  id: string;
  created_at: string;
  problem_id: string;
  user_draft: string;
  time_spent_seconds: number;
  ai_feedback: string;
  sub_problems?: {
    subject: string;
    source_exam: string;
    target_issue: string;
  };
};

type FontSizeLevel = 'sm' | 'base' | 'lg' | 'xl';

const fontSizes: Record<FontSizeLevel, { text: string; lh: string; label: string }> = {
  sm: { text: '13px', lh: '1.6', label: '小 (13px)' },
  base: { text: '15px', lh: '1.75', label: '標準 (15px)' },
  lg: { text: '17px', lh: '1.85', label: '大 (17px)' },
  xl: { text: '20px', lh: '1.95', label: '特大 (20px)' },
};

export default function DashboardPage() {
  const router = useRouter();
  const [submissions, setSubmissions] = useState<SubmissionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [fontSize, setFontSize] = useState<FontSizeLevel>('base');

  useEffect(() => {
    fetchSubmissions();
  }, []);

  async function fetchSubmissions() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('submissions')
        .select(`
          id,
          created_at,
          problem_id,
          user_draft,
          time_spent_seconds,
          ai_feedback,
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
      console.error('履歴取得エラー:', err.message);
    } finally {
      setLoading(false);
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('この起案履歴を削除しますか？')) return;
    try {
      const { error } = await supabase.from('submissions').delete().eq('id', id);
      if (error) throw error;
      setSubmissions(submissions.filter((s) => s.id !== id));
    } catch (err: any) {
      alert('削除に失敗しました: ' + err.message);
    }
  };

  const handleRetry = (problemId: string, userDraft: string) => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('retry_problem_id', problemId);
      sessionStorage.setItem('retry_draft', userDraft);
    }
    router.push('/practice');
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f1f5f9', color: '#0f172a', fontFamily: 'sans-serif', padding: '24px 20px' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        
        {/* ヘッダーエリア */}
        <header
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            padding: '16px 24px',
            marginBottom: '20px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
            border: '1px solid #cbd5e1',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '24px' }}>📋</span>
              <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 'bold', color: '#0f172a' }}>
                起案・添削履歴一覧
              </h1>
              <span style={{ backgroundColor: '#e2e8f0', color: '#334155', padding: '2px 8px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold' }}>
                {submissions.length} 件
              </span>
            </div>
            <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#64748b' }}>
              これまでに提出した答案の管理、AI採点講評の復習、答案の再起案ができます
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            {/* 文字サイズ変更コントローラー */}
            <div style={{ display: 'flex', alignItems: 'center', backgroundColor: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '3px 6px', gap: '4px' }}>
              <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#475569', marginRight: '4px' }}>🔍 文字サイズ</span>
              {(['sm', 'base', 'lg', 'xl'] as FontSizeLevel[]).map((level) => {
                const isActive = fontSize === level;
                return (
                  <button
                    key={level}
                    type="button"
                    onClick={() => setFontSize(level)}
                    style={{
                      padding: '3px 8px',
                      fontSize: '11px',
                      fontWeight: 'bold',
                      borderRadius: '4px',
                      border: isActive ? '1px solid #0284c7' : 'none',
                      backgroundColor: isActive ? '#0284c7' : 'transparent',
                      color: isActive ? '#ffffff' : '#334155',
                      cursor: 'pointer',
                    }}
                  >
                    {level === 'sm' ? '小' : level === 'base' ? '標準' : level === 'lg' ? '大' : '特大'}
                  </button>
                );
              })}
            </div>

            <Link
              href="/practice"
              style={{
                backgroundColor: '#0284c7',
                color: '#ffffff',
                padding: '8px 16px',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 'bold',
                textDecoration: 'none',
                boxShadow: '0 2px 4px rgba(2,132,199,0.25)',
              }}
            >
              ✍️ CBT起案室へ戻る
            </Link>
          </div>
        </header>

        {/* 履歴リスト */}
        {loading ? (
          <div style={{ backgroundColor: '#ffffff', padding: '40px', textAlign: 'center', borderRadius: '12px', color: '#64748b' }}>
            履歴データを読み込み中...
          </div>
        ) : submissions.length === 0 ? (
          <div style={{ backgroundColor: '#ffffff', padding: '60px 20px', textAlign: 'center', borderRadius: '12px', border: '1px solid #cbd5e1' }}>
            <p style={{ fontSize: '16px', color: '#64748b', margin: '0 0 16px' }}>まだ提出された起案履歴がありません。</p>
            <Link
              href="/practice"
              style={{
                backgroundColor: '#0284c7',
                color: '#ffffff',
                padding: '10px 20px',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: 'bold',
                textDecoration: 'none',
              }}
            >
              最初の起案をはじめる
            </Link>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {submissions.map((sub) => {
              const minutesSpent = Math.floor(sub.time_spent_seconds / 60);
              const formattedDate = new Date(sub.created_at).toLocaleString('ja-JP');
              const subjectName = sub.sub_problems?.subject || '科目未分類';
              const issueName = sub.sub_problems?.target_issue || '総合問題';
              const examName = sub.sub_problems?.source_exam || '本番形式';

              return (
                <div
                  key={sub.id}
                  style={{
                    backgroundColor: '#ffffff',
                    borderRadius: '12px',
                    border: '1px solid #cbd5e1',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
                    overflow: 'hidden',
                  }}
                >
                  {/* カード上部：論点メタ情報 & 操作ボタン */}
                  <div style={{ padding: '14px 20px', borderBottom: '1px solid #e2e8f0', backgroundColor: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                        <span style={{ backgroundColor: '#e0f2fe', color: '#0369a1', border: '1px solid #bae6fd', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold' }}>
                          {subjectName}
                        </span>
                        <span style={{ fontSize: '12px', color: '#475569', fontWeight: 'bold' }}>
                          {examName}
                        </span>
                        <span style={{ fontSize: '12px', color: '#94a3b8' }}>
                          📅 {formattedDate}
                        </span>
                      </div>
                      <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 'bold', color: '#0f172a' }}>
                        論点: {issueName}
                      </h3>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '12px', color: '#475569', backgroundColor: '#ffffff', border: '1px solid #cbd5e1', padding: '4px 10px', borderRadius: '6px', fontWeight: 'bold' }}>
                        ⏱ {minutesSpent}分
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRetry(sub.problem_id, sub.user_draft)}
                        style={{
                          padding: '5px 12px',
                          backgroundColor: '#ffffff',
                          border: '1px solid #cbd5e1',
                          borderRadius: '6px',
                          fontSize: '12px',
                          fontWeight: 'bold',
                          color: '#0369a1',
                          cursor: 'pointer',
                        }}
                      >
                        🔄 再起案
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(sub.id)}
                        style={{
                          padding: '5px 12px',
                          backgroundColor: '#fef2f2',
                          border: '1px solid #fecaca',
                          borderRadius: '6px',
                          fontSize: '12px',
                          fontWeight: 'bold',
                          color: '#dc2626',
                          cursor: 'pointer',
                        }}
                      >
                        🗑 削除
                      </button>
                    </div>
                  </div>

                  {/* カード下部：提出答案 ＆ AI採点講評（選択サイズを適用） */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '16px', padding: '20px' }}>
                    
                    {/* あなたの提出答案 */}
                    <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '16px', display: 'flex', flexDirection: 'column' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', borderBottom: '1px solid #f1f5f9', paddingBottom: '6px' }}>
                        <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#475569' }}>📝 あなたの提出答案</span>
                        <span style={{ fontSize: '11px', color: '#64748b' }}>
                          {sub.user_draft.length} 文字（約 {(sub.user_draft.length / 690).toFixed(1)} 頁）
                        </span>
                      </div>
                      <div
                        style={{
                          fontFamily: 'serif',
                          fontSize: fontSizes[fontSize].text,
                          lineHeight: fontSizes[fontSize].lh,
                          color: '#1e293b',
                          whiteSpace: 'pre-wrap',
                          maxHeight: '380px',
                          overflowY: 'auto',
                          paddingRight: '6px',
                        }}
                      >
                        {sub.user_draft}
                      </div>
                    </div>

                    {/* AI採点・添削講評 */}
                    <div style={{ backgroundColor: '#fffdf5', border: '1px solid #fef08a', borderRadius: '8px', padding: '16px', display: 'flex', flexDirection: 'column' }}>
                      <div style={{ marginBottom: '10px', borderBottom: '1px solid #fef9c3', paddingBottom: '6px' }}>
                        <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#854d0e' }}>⚖️ AI採点・添削講評</span>
                      </div>
                      <div
                        style={{
                          fontSize: fontSizes[fontSize].text,
                          lineHeight: fontSizes[fontSize].lh,
                          color: '#1e293b',
                          whiteSpace: 'pre-wrap',
                          maxHeight: '380px',
                          overflowY: 'auto',
                          paddingRight: '6px',
                        }}
                      >
                        {sub.ai_feedback}
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
