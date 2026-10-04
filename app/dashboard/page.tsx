'use client';

import React, { useEffect, useState } from 'react';
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

type FontSizeLevel = 'sm' | 'base' | 'lg' | 'xl';

const fontSizes: Record<FontSizeLevel, { size: string; lineHeight: string; label: string }> = {
  sm: { size: '13px', lineHeight: '1.6', label: '小 (13px)' },
  base: { size: '15px', lineHeight: '1.7', label: '標準 (15px)' },
  lg: { size: '18px', lineHeight: '1.8', label: '大 (18px)' },
  xl: { size: '21px', lineHeight: '1.9', label: '特大 (21px)' },
};

export default function DashboardPage() {
  const [submissions, setSubmissions] = useState<SubmissionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [fontSize, setFontSize] = useState<FontSizeLevel>('base');

  useEffect(() => {
    async function loadData() {
      try {
        const { data: subsData, error } = await supabase
          .from('submissions')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) {
          console.warn('submissions fetch error:', error);
          setSubmissions([]);
          return;
        }

        const items = subsData || [];
        if (items.length > 0) {
          const { data: probData } = await supabase
            .from('sub_problems')
            .select('id, subject, source_exam, target_issue');

          const probMap = new Map();
          if (probData) {
            probData.forEach((p) => probMap.set(p.id, p));
          }

          const combined = items.map((sub: any) => {
            const prob = probMap.get(sub.problem_id);
            return {
              ...sub,
              problem_subject: prob?.subject || '民法',
              problem_title: prob?.source_exam || '本番演習',
              problem_issue: prob?.target_issue || '94条2項類推適用',
            };
          });
          setSubmissions(combined);
        } else {
          setSubmissions([]);
        }
      } catch (e) {
        console.error('Fetch exception:', e);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  const handleRetry = (item: SubmissionItem) => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('retry_problem_id', item.problem_id);
      sessionStorage.setItem('retry_draft', item.user_draft);
      sessionStorage.setItem('parent_submission_id', item.id);
    }
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f1f5f9', color: '#0f172a', fontFamily: 'sans-serif' }}>
      
      {/* 白基調・高コントラストヘッダー */}
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 50,
          backgroundColor: '#ffffff',
          borderBottom: '3px solid #0284c7',
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
          padding: '10px 20px',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '22px' }}>🕒</span>
          <div>
            <h1 style={{ margin: 0, fontSize: '16px', fontWeight: 'bold', color: '#0f172a' }}>
              起案履歴・復習ダッシュボード
            </h1>
            <p style={{ margin: 0, fontSize: '11px', color: '#64748b' }}>
              過去の答案・所要時間・AI添削講評の確認と再起案
            </p>
          </div>
        </div>

        {/* コントロールエリア（文字サイズボタン & 戻るボタン） */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          
          {/* 文字サイズ切り替えパネル */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              backgroundColor: '#f8fafc',
              border: '2px solid #cbd5e1',
              borderRadius: '8px',
              padding: '4px 8px',
              gap: '6px',
            }}
          >
            <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#334155', marginRight: '4px' }}>
              🔍 文字サイズ:
            </span>
            {(['sm', 'base', 'lg', 'xl'] as FontSizeLevel[]).map((level) => {
              const isActive = fontSize === level;
              return (
                <button
                  key={level}
                  type="button"
                  onClick={() => setFontSize(level)}
                  style={{
                    padding: '4px 10px',
                    fontSize: '12px',
                    fontWeight: 'bold',
                    borderRadius: '6px',
                    border: isActive ? '2px solid #0284c7' : '1px solid #cbd5e1',
                    backgroundColor: isActive ? '#0284c7' : '#ffffff',
                    color: isActive ? '#ffffff' : '#334155',
                    cursor: 'pointer',
                    boxShadow: isActive ? '0 1px 3px rgba(2,132,199,0.3)' : 'none',
                    transition: 'all 0.15s ease',
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
              display: 'inline-block',
              padding: '8px 14px',
              backgroundColor: '#0284c7',
              color: '#ffffff',
              fontWeight: 'bold',
              fontSize: '12px',
              borderRadius: '6px',
              textDecoration: 'none',
              boxShadow: '0 2px 4px rgba(2,132,199,0.2)',
            }}
          >
            ← CBT起案画面に戻る
          </Link>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main style={{ maxWidth: '1100px', margin: '24px auto', padding: '0 16px' }}>
        
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: '#475569' }}>
            <p style={{ fontWeight: 'bold', fontSize: '14px' }}>起案履歴を確認中...</p>
          </div>
        ) : submissions.length === 0 ? (
          <div
            style={{
              backgroundColor: '#ffffff',
              border: '2px solid #cbd5e1',
              borderRadius: '12px',
              padding: '48px 24px',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: '36px', marginBottom: '12px' }}>📭</div>
            <h2 style={{ fontSize: '16px', fontWeight: 'bold', color: '#1e293b', marginBottom: '8px' }}>
              保存された起案履歴はありません
            </h2>
            <p style={{ fontSize: '13px', color: '#64748b', maxWidth: '460px', margin: '0 auto 20px', lineHeight: '1.6' }}>
              起案画面（/practice）で答案を提出すると、ここに日時・所要時間・AI添削講評が自動で蓄積されます。
            </p>
            <Link
              href="/practice"
              style={{
                display: 'inline-block',
                padding: '10px 20px',
                backgroundColor: '#047857',
                color: '#ffffff',
                fontWeight: 'bold',
                fontSize: '13px',
                borderRadius: '6px',
                textDecoration: 'none',
              }}
            >
              ✍️ CBT起案画面を開く
            </Link>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px', color: '#475569', fontWeight: 'bold', padding: '0 4px' }}>
              <span>全 {submissions.length} 件の起案履歴</span>
              <span>現在の文字サイズ: <strong style={{ color: '#0284c7' }}>{fontSizes[fontSize].label}</strong></span>
            </div>

            {submissions.map((sub) => (
              <div
                key={sub.id}
                style={{
                  backgroundColor: '#ffffff',
                  border: '2px solid #cbd5e1',
                  borderRadius: '12px',
                  padding: '20px',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
                }}
              >
                {/* メタ情報バー */}
                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    borderBottom: '1px solid #e2e8f0',
                    paddingBottom: '12px',
                    marginBottom: '16px',
                    fontSize: '12px',
                    gap: '8px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <span
                      style={{
                        padding: '3px 8px',
                        backgroundColor: '#e0f2fe',
                        color: '#0369a1',
                        border: '1px solid #bae6fd',
                        borderRadius: '4px',
                        fontWeight: 'bold',
                        fontSize: '11px',
                      }}
                    >
                      {sub.problem_subject}
                    </span>
                    <span style={{ fontWeight: 'bold', color: '#0f172a', fontSize: '14px' }}>
                      {sub.problem_title}
                    </span>
                    <span style={{ color: '#475569' }}>
                      論点: <strong style={{ color: '#0f172a' }}>{sub.problem_issue}</strong>
                    </span>
                  </div>

                  <div style={{ display: 'flex', gap: '16px', color: '#64748b', fontSize: '11px', fontFamily: 'monospace' }}>
                    <span>⏱ {Math.floor((sub.time_spent_seconds || 0) / 60)}分{(sub.time_spent_seconds || 0) % 60}秒</span>
                    <span>📅 {new Date(sub.created_at).toLocaleString('ja-JP')}</span>
                  </div>
                </div>

                {/* 2カラム表示（答案 vs AI講評） */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
                    gap: '16px',
                  }}
                >
                  {/* 起案答案 */}
                  <div
                    style={{
                      backgroundColor: '#f8fafc',
                      border: '1px solid #cbd5e1',
                      borderRadius: '8px',
                      padding: '14px',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        borderBottom: '1px solid #cbd5e1',
                        paddingBottom: '8px',
                        marginBottom: '10px',
                      }}
                    >
                      <span style={{ fontWeight: 'bold', color: '#1e293b', fontSize: '13px' }}>
                        📝 起案答案
                      </span>
                      <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 'bold' }}>
                        {sub.user_draft?.length || 0} 字
                      </span>
                    </div>
                    <div
                      style={{
                        fontFamily: 'serif',
                        color: '#0f172a',
                        whiteSpace: 'pre-wrap',
                        maxHeight: '380px',
                        overflowY: 'auto',
                        fontSize: fontSizes[fontSize].size,
                        lineHeight: fontSizes[fontSize].lineHeight,
                      }}
                    >
                      {sub.user_draft}
                    </div>
                  </div>

                  {/* AI講評 */}
                  <div
                    style={{
                      backgroundColor: '#fffbeb',
                      border: '1px solid #fde68a',
                      borderRadius: '8px',
                      padding: '14px',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        borderBottom: '1px solid #fde68a',
                        paddingBottom: '8px',
                        marginBottom: '10px',
                      }}
                    >
                      <span style={{ fontWeight: 'bold', color: '#78350f', fontSize: '13px' }}>
                        ⚖️ AI添削・採点講評
                      </span>
                    </div>
                    <div
                      style={{
                        fontFamily: 'sans-serif',
                        color: '#1e293b',
                        whiteSpace: 'pre-wrap',
                        maxHeight: '380px',
                        overflowY: 'auto',
                        fontSize: fontSizes[fontSize].size,
                        lineHeight: fontSizes[fontSize].lineHeight,
                      }}
                    >
                      {sub.ai_feedback || '講評なし'}
                    </div>
                  </div>
                </div>

                {/* 再起案ボタン */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '14px', paddingTop: '12px', borderTop: '1px solid #e2e8f0' }}>
                  <Link
                    href="/practice"
                    onClick={() => handleRetry(sub)}
                    style={{
                      padding: '8px 16px',
                      backgroundColor: '#f59e0b',
                      color: '#0f172a',
                      fontWeight: 'bold',
                      fontSize: '12px',
                      borderRadius: '6px',
                      textDecoration: 'none',
                    }}
                  >
                    🔄 この答案を読み込んで再起案する
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}

      </main>
    </div>
  );
}