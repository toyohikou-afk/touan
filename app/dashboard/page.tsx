'use client';

import React, { useState, useEffect, useMemo } from 'react';
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

const KNOWN_PROBLEM_FALLBACKS: Record<string, { subject: string; target_issue: string }> = {
  'prob-1-co-principals-withdrawal': { subject: '刑法', target_issue: '共犯からの離脱・強盗致傷罪の共同正犯' },
  'c10919f3-ec0d-4db4-b860-34bf19becaae': { subject: '刑法', target_issue: '共犯からの離脱・強盗致傷罪の共同正犯' },
  'prob-r7-civil-law': { subject: '民法', target_issue: '共同抵当と物上保証人代位・賃貸借合意解除' },
  'prob-r7-commercial-law': { subject: '商法', target_issue: '代表取締役解職・役員報酬減額・支配権移転新株発行' },
  'prob-r7-civil-procedure': { subject: '民事訴訟法', target_issue: '自己利用文書（民訴220条4号ニ）・反訴相殺' },
  'prob-r7-criminal-law': { subject: '刑法', target_issue: '不動産二重譲渡と横領・客体の錯誤と共犯離脱' },
  'prob-r7-criminal-procedure': { subject: '刑事訴訟法', target_issue: '予備的訴因追加（312条1項）・択一的認定' },
  'prob-r7-constitutional-law': { subject: '憲法', target_issue: '表現の自由・公の施設利用制限・明白な危険' },
  'prob-r7-administrative-law': { subject: '行政法', target_issue: '開発許可処分・処分性・原告適格・裁量権逸脱濫用' }
};

type FontSizeLevel = 'sm' | 'base' | 'lg' | 'xl';

const fontSizes: Record<FontSizeLevel, { text: string; lh: string; label: string }> = {
  sm: { text: '13px', lh: '1.6', label: '小' },
  base: { text: '15px', lh: '1.75', label: '標準' },
  lg: { text: '17px', lh: '1.85', label: '大' },
  xl: { text: '20px', lh: '1.95', label: '特大' },
};

export default function DashboardPage() {
  const [adminQuery, setAdminQuery] = useState('');
  const [submissions, setSubmissions] = useState<SubmissionItem[]>([]);
  const [problemMap, setProblemMap] = useState<Record<string, ProblemInfo>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | number | null>(null);
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState<string>('ALL');
  
  // 文字サイズ設定
  const [fontSize, setFontSize] = useState<FontSizeLevel>('base');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedFs = localStorage.getItem('touan_font_size') as FontSizeLevel;
      if (savedFs && fontSizes[savedFs]) setFontSize(savedFs);

      const params = new URLSearchParams(window.location.search);
      const admin = params.get('admin');
      if (admin) setAdminQuery(`?admin=${encodeURIComponent(admin)}`);
    }
    loadData();
  }, []);

  const changeFontSize = (level: FontSizeLevel) => {
    setFontSize(level);
    if (typeof window !== 'undefined') {
      localStorage.setItem('touan_font_size', level);
    }
  };

  const loadData = async () => {
    setIsLoading(true);
    try {
      const { data: problemsData } = await supabase.from('problems').select('id, subject, target_issue');
      if (problemsData) {
        const map: Record<string, ProblemInfo> = {};
        problemsData.forEach((p) => {
          map[p.id] = p;
        });
        setProblemMap(map);
      }

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

  const handleDeleteSubmission = async (id: string | number) => {
    const isConfirmed = window.confirm(
      'この答案履歴を削除しますか？\n※削除した起案内容やAI採点講評は復元できません。'
    );
    if (!isConfirmed) return;

    try {
      const { error } = await supabase.from('submissions').delete().eq('id', id);
      if (error) throw error;
      setSubmissions((prev) => prev.filter((item) => item.id !== id));
      alert('答案履歴を削除しました。');
    } catch (err: unknown) {
      alert(`削除に失敗しました: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  const filteredSubmissions = useMemo(() => {
    if (selectedSubjectFilter === 'ALL') return submissions;
    return submissions.filter((item) => {
      const prob = problemMap[item.problem_id] || KNOWN_PROBLEM_FALLBACKS[item.problem_id];
      const subj = prob?.subject || '刑法';
      return subj === selectedSubjectFilter;
    });
  }, [submissions, selectedSubjectFilter, problemMap]);

  const availableSubjects = useMemo(() => {
    const subs = new Set<string>();
    submissions.forEach((item) => {
      const prob = problemMap[item.problem_id] || KNOWN_PROBLEM_FALLBACKS[item.problem_id];
      if (prob?.subject) subs.add(prob.subject);
    });
    return Array.from(subs);
  }, [submissions, problemMap]);

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
    <div style={{ height: 'calc(100vh - 56px)', backgroundColor: '#f1f5f9', color: '#0f172a', display: 'flex', flexDirection: 'column', fontFamily: 'sans-serif', overflow: 'hidden' }}>
      
      {/* practice風 48pxスリムヘッダー */}
      <header style={{ height: '48px', backgroundColor: '#ffffff', borderBottom: '1px solid #cbd5e1', padding: '0 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 1px 2px rgba(0,0,0,0.04)', flexShrink: 0 }}>
        
        {/* 左側：タイトル ＆ 科目フィルタ ＆ 件数バッジ */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '18px' }}>📊</span>
          <span style={{ fontSize: '13px', fontWeight: '900', color: '#0f172a' }}>答案起案履歴</span>

          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginLeft: '6px' }}>
            <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#64748b' }}>科目:</span>
            <select
              value={selectedSubjectFilter}
              onChange={(e) => setSelectedSubjectFilter(e.target.value)}
              style={{
                fontSize: '12px',
                fontWeight: 'bold',
                padding: '3px 8px',
                borderRadius: '6px',
                border: '1.5px solid #2563eb',
                backgroundColor: '#eff6ff',
                color: '#1d4ed8',
                cursor: 'pointer',
                outline: 'none',
              }}
            >
              <option value="ALL">全科目 ({submissions.length})</option>
              {availableSubjects.map((sub) => (
                <option key={sub} value={sub}>{sub}</option>
              ))}
            </select>
          </div>

          <span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '4px', backgroundColor: '#e2e8f0', color: '#334155', fontWeight: 'bold' }}>
            {filteredSubmissions.length} 件
          </span>
        </div>

        {/* 右側：文字サイズ切り替え ＆ 起案室直通ボタン */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* 文字サイズボタン群 */}
          <div style={{ display: 'flex', alignItems: 'center', backgroundColor: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '2px 4px', gap: '2px' }}>
            <span style={{ fontSize: '10px', fontWeight: 'bold', color: '#475569', marginRight: '3px' }}>🔍</span>
            {(['sm', 'base', 'lg', 'xl'] as FontSizeLevel[]).map((level) => (
              <button
                key={level}
                type="button"
                onClick={() => changeFontSize(level)}
                style={{
                  padding: '2px 6px',
                  fontSize: '11px',
                  fontWeight: 'bold',
                  borderRadius: '4px',
                  border: fontSize === level ? '1px solid #0284c7' : 'none',
                  backgroundColor: fontSize === level ? '#0284c7' : 'transparent',
                  color: fontSize === level ? '#ffffff' : '#475569',
                  cursor: 'pointer',
                }}
              >
                {fontSizes[level].label}
              </button>
            ))}
          </div>

          <Link
            href={`/practice${adminQuery}`}
            style={{
              padding: '4px 12px',
              backgroundColor: '#2563eb',
              borderRadius: '6px',
              fontSize: '11px',
              fontWeight: 'bold',
              color: '#ffffff',
              textDecoration: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            ⚖️ CBT起案室へ進む
          </Link>
        </div>
      </header>

      {/* メインリストエリア */}
      <main style={{ flex: 1, padding: '16px', overflowY: 'auto' }}>
        <div style={{ maxWidth: '960px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          
          {isLoading ? (
            <div style={{ backgroundColor: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '12px', padding: '48px', textAlign: 'center', color: '#64748b', fontSize: '14px' }}>
              ⏳ 答案履歴を読み込み中...
            </div>
          ) : filteredSubmissions.length === 0 ? (
            <div style={{ backgroundColor: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '12px', padding: '48px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '32px' }}>📭</span>
              <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#334155' }}>該当する起案履歴がありません</div>
              <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>
                起案室で答案を作成し「🚀 答案提出・AI厳格採点」を実行すると、ここにアーカイブ保存されます。
              </p>
            </div>
          ) : (
            filteredSubmissions.map((item) => {
              const prob = problemMap[item.problem_id] || KNOWN_PROBLEM_FALLBACKS[item.problem_id];
              const subjectDisplay = prob?.subject || '刑法';
              const issueDisplay = prob?.target_issue || item.problem_id;
              const isExpanded = expandedId === item.id;

              return (
                <div
                  key={item.id}
                  style={{
                    backgroundColor: '#ffffff',
                    border: '1px solid #cbd5e1',
                    borderRadius: '10px',
                    padding: '14px',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px'
                  }}
                >
                  {/* カード上部 */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <span style={{ padding: '2px 8px', backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', color: '#1d4ed8', fontSize: '11px', fontWeight: 'bold', borderRadius: '4px' }}>
                        {subjectDisplay}
                      </span>
                      <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#0f172a' }}>
                        {issueDisplay}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontSize: '11px', color: '#94a3b8', fontFamily: 'monospace' }}>
                        {formatDate(item.created_at)}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleDeleteSubmission(item.id)}
                        style={{
                          padding: '3px 8px',
                          backgroundColor: '#fff1f2',
                          border: '1px solid #fecdd3',
                          color: '#be123c',
                          fontSize: '11px',
                          fontWeight: 'bold',
                          borderRadius: '4px',
                          cursor: 'pointer'
                        }}
                      >
                        🗑️ 削除
                      </button>
                    </div>
                  </div>

                  {/* 起案スペック */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '11px', color: '#475569', fontFamily: 'monospace' }}>
                    <div>
                      起案時間: <strong style={{ color: '#0f172a' }}>{formatTime(item.time_spent_seconds || 0)}</strong>
                    </div>
                    <div>
                      文字数: <strong style={{ color: '#0f172a' }}>{item.user_draft?.length || 0}</strong> 字（約 {((item.user_draft?.length || 0) / 690).toFixed(1)} 頁）
                    </div>
                  </div>

                  {/* 答案本文（文字サイズ連動） */}
                  <div
                    style={{
                      backgroundColor: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      borderRadius: '6px',
                      padding: '12px',
                      fontSize: fontSizes[fontSize].text,
                      lineHeight: fontSizes[fontSize].lh,
                      fontFamily: 'serif',
                      whiteSpace: 'pre-wrap',
                      maxHeight: '180px',
                      overflowY: 'auto',
                      color: '#1e293b'
                    }}
                  >
                    {item.user_draft}
                  </div>

                  {/* AI採点講評アコーディオン */}
                  {item.ai_feedback && (
                    <div>
                      <button
                        type="button"
                        onClick={() => setExpandedId(isExpanded ? null : item.id)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#b45309',
                          fontSize: '11px',
                          fontWeight: 'bold',
                          cursor: 'pointer',
                          padding: '2px 0',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                      >
                        <span>{isExpanded ? '▼ 考査委員講評を折りたたむ' : '▶ 考査委員講評（答案構成・即死地雷チェック）を表示する'}</span>
                      </button>

                      {isExpanded && (
                        <div
                          style={{
                            marginTop: '8px',
                            backgroundColor: '#fffdf5',
                            border: '1px solid #fde047',
                            borderRadius: '6px',
                            padding: '12px',
                            fontSize: fontSizes[fontSize].text,
                            lineHeight: fontSizes[fontSize].lh,
                            color: '#1e293b',
                            whiteSpace: 'pre-wrap'
                          }}
                        >
                          {item.ai_feedback}
                        </div>
                      )}
                    </div>
                  )}

                </div>
              );
            })
          )}

        </div>
      </main>

    </div>
  );
}
