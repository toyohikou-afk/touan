'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

type ProblemData = {
  id: string;
  subject: string;
  source_exam: string;
  target_issue: string;
  suggested_time_minutes: number;
  fact_context: string;
  standard_norm: string;
  key_facts: string[];
};

type AnatomyData = {
  pass_reason_summary: string;
  statutory_framework: string;
  full_model_answer: string;
  skeleton_answer: string;
  syllogism_mapping: {
    major_premise?: { issue?: string; purpose?: string; norm?: string };
    minor_premise?: { facts?: string[]; evaluations?: string[] };
    conclusion?: string;
  };
  thinking_steps: Array<{ step: number; title: string; description: string }>;
  application_blueprint: Array<{ fact: string; evaluation: string }>;
  dissected_segments: Array<{ type: string; text: string; annotation: string }>;
};

type FontSizeLevel = 'sm' | 'base' | 'lg' | 'xl';

const fontSizes: Record<FontSizeLevel, { text: string; lh: string; label: string }> = {
  sm: { text: '13px', lh: '1.6', label: '小 (13px)' },
  base: { text: '15px', lh: '1.75', label: '標準 (15px)' },
  lg: { text: '17px', lh: '1.85', label: '大 (17px)' },
  xl: { text: '20px', lh: '1.95', label: '特大 (20px)' },
};

export default function PracticePage() {
  const [problem, setProblem] = useState<ProblemData | null>(null);
  const [anatomy, setAnatomy] = useState<AnatomyData | null>(null);
  const [loading, setLoading] = useState(true);

  // エディタ状態
  const [draft, setDraft] = useState('');
  const [fontSize, setFontSize] = useState<FontSizeLevel>('base');
  const [activeTab, setActiveTab] = useState<'problem' | 'statute'>('problem');
  const [showAssist, setShowAssist] = useState(false);
  const [assistTab, setAssistTab] = useState<'steps' | 'blueprint' | 'anatomy' | 'syllogism'>('steps');

  // タイマー状態（秒）
  const [timeLeft, setTimeLeft] = useState(70 * 60);
  const [isTimerRunning, setIsTimerRunning] = useState(false);

  // 提出・AI状態
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [selectedAnnotation, setSelectedAnnotation] = useState<string | null>(null);

  // 検索・置換
  const [searchWord, setSearchWord] = useState('');
  const [replaceWord, setReplaceWord] = useState('');
  const [showSearch, setShowSearch] = useState(false);

  // ─── 問題作成ポップアップ（モーダル）状態 ───
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isCreatingProblem, setIsCreatingProblem] = useState(false);
  const [newProblemForm, setNewProblemForm] = useState({
    subject: '民法',
    source_exam: '令和6年 予備試験',
    target_issue: '',
    suggested_time_minutes: 70,
    fact_context: '',
    standard_norm: '',
  });

  // 初期データ読み込み
  useEffect(() => {
    async function initData() {
      try {
        setLoading(true);

        let targetProblemId = 'a1111111-1111-1111-1111-111111111111';
        if (typeof window !== 'undefined') {
          const retryId = sessionStorage.getItem('retry_problem_id');
          const retryDraft = sessionStorage.getItem('retry_draft');
          if (retryId) targetProblemId = retryId;
          if (retryDraft) setDraft(retryDraft);
          sessionStorage.removeItem('retry_problem_id');
          sessionStorage.removeItem('retry_draft');
        }

        const { data: probData } = await supabase
          .from('sub_problems')
          .select('*')
          .eq('id', targetProblemId)
          .single();

        if (probData) {
          setProblem(probData);
          setTimeLeft((probData.suggested_time_minutes || 70) * 60);
        }

        const { data: anatData } = await supabase
          .from('model_answer_anatomies')
          .select('*')
          .eq('problem_id', targetProblemId)
          .single();

        if (anatData) {
          setAnatomy(anatData);
        }
      } catch (err) {
        console.error('データ取得失敗:', err);
      } finally {
        setLoading(false);
      }
    }

    initData();
  }, []);

  // タイマーカウント
  useEffect(() => {
    let timer: any;
    if (isTimerRunning && timeLeft > 0) {
      timer = setInterval(() => setTimeLeft((t) => t - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [isTimerRunning, timeLeft]);

  // Tabキーインデント
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const textarea = e.currentTarget;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const val = textarea.value;
      setDraft(val.substring(0, start) + ' ' + val.substring(end));
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + 1;
      }, 0);
    }
  };

  // 置換実行
  const handleReplace = () => {
    if (!searchWord) return;
    setDraft(draft.replaceAll(searchWord, replaceWord));
  };

  // 答案提出 & AI添削
  const handleSubmit = async () => {
    if (!draft.trim()) {
      alert('答案が入力されていません。');
      return;
    }
    if (!confirm('起案を終了し、答案を提出してAI採点を実行しますか？')) return;

    try {
      setIsSubmitting(true);
      setIsTimerRunning(false);
      setFeedback('AIが答案を分析・採点しています（規範定立、あてはめ、三段論法の充足度を検証中）...');

      const response = await fetch('/api/evaluate-draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          problemId: problem?.id,
          userDraft: draft,
          timeSpentSeconds: ((problem?.suggested_time_minutes || 70) * 60) - timeLeft,
          standardNorm: problem?.standard_norm,
          keyFacts: problem?.key_facts,
        }),
      });

      const resJson = await response.json();
      const aiComment = resJson.feedback || '採点が完了しました。';
      setFeedback(aiComment);

      await supabase.from('submissions').insert({
        problem_id: problem?.id,
        user_draft: draft,
        time_spent_seconds: Math.max(0, ((problem?.suggested_time_minutes || 70) * 60) - timeLeft),
        ai_feedback: aiComment,
      });

      alert('答案の提出とAI採点が完了し、ダッシュボードに保存されました！');
    } catch (e: any) {
      alert('採点エラー: ' + e.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ─── ポップアップから問題を作成して即座に読み込む ───
  const handleCreateProblemSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProblemForm.target_issue.trim()) {
      alert('論点・テーマを入力してください。');
      return;
    }
    if (!newProblemForm.fact_context.trim()) {
      alert('問題文・事実を入力してください。');
      return;
    }

    try {
      setIsCreatingProblem(true);
      const { data, error } = await supabase
        .from('sub_problems')
        .insert({
          subject: newProblemForm.subject,
          source_exam: newProblemForm.source_exam || '作成問題',
          target_issue: newProblemForm.target_issue,
          suggested_time_minutes: Number(newProblemForm.suggested_time_minutes) || 70,
          fact_context: newProblemForm.fact_context,
          standard_norm: newProblemForm.standard_norm || '',
          key_facts: [],
        })
        .select()
        .single();

      if (error) throw error;

      if (data) {
        // 新しい問題を画面に即時ロード
        setProblem(data);
        setAnatomy(null);
        setTimeLeft((data.suggested_time_minutes || 70) * 60);
        setDraft('');
        setIsTimerRunning(false);
        setFeedback(null);
        setShowCreateModal(false);

        // フォーム初期化
        setNewProblemForm({
          subject: '民法',
          source_exam: '令和6年 予備試験',
          target_issue: '',
          suggested_time_minutes: 70,
          fact_context: '',
          standard_norm: '',
        });

        alert('新しい問題を作成し、画面に読み込みました！');
      }
    } catch (err: any) {
      alert('問題作成に失敗しました: ' + (err.message || '通信エラー'));
    } finally {
      setIsCreatingProblem(false);
    }
  };

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const charCount = draft.length;
  const maxChars = 2760;
  const progressRatio = Math.min(100, Math.round((charCount / maxChars) * 100));

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f1f5f9', color: '#0f172a', fontFamily: 'sans-serif', display: 'flex', flexDirection: 'column' }}>
      
      {/* 1. 最上部ヘッダー */}
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 40,
          backgroundColor: '#ffffff',
          borderBottom: '3px solid #0284c7',
          padding: '8px 20px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '20px' }}>⚖️</span>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ backgroundColor: '#e0f2fe', color: '#0369a1', border: '1px solid #bae6fd', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold' }}>
                {problem?.subject || '民法'}
              </span>
              <h1 style={{ margin: 0, fontSize: '15px', fontWeight: 'bold', color: '#0f172a' }}>
                {problem?.source_exam || '本番CBT起案'}
              </h1>
            </div>
            <p style={{ margin: 0, fontSize: '11px', color: '#64748b' }}>
              論点: <strong style={{ color: '#0284c7' }}>{problem?.target_issue || '読み込み中...'}</strong>
            </p>
          </div>
        </div>

        {/* 中央：タイマー & 文字数メーター */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: '#f8fafc', padding: '4px 10px', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
            <span style={{ fontSize: '16px' }}>⏱</span>
            <span style={{ fontFamily: 'monospace', fontSize: '18px', fontWeight: 'bold', color: timeLeft <= 600 ? '#dc2626' : '#0f172a' }}>
              {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
            </span>
            <button
              type="button"
              onClick={() => setIsTimerRunning(!isTimerRunning)}
              style={{
                padding: '3px 8px',
                fontSize: '11px',
                fontWeight: 'bold',
                borderRadius: '4px',
                cursor: 'pointer',
                backgroundColor: isTimerRunning ? '#fef3c7' : '#dcfce7',
                color: isTimerRunning ? '#92400e' : '#166534',
                border: isTimerRunning ? '1px solid #fde68a' : '1px solid #bbf7d0',
              }}
            >
              {isTimerRunning ? '一時停止' : '開始'}
            </button>
          </div>

          <div style={{ minWidth: '150px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontWeight: 'bold', marginBottom: '3px', color: '#475569' }}>
              <span>文字数: <strong style={{ color: charCount > maxChars ? '#dc2626' : '#0284c7' }}>{charCount}</strong> / {maxChars} 字</span>
              <span>約 {(charCount / 690).toFixed(1)} 頁</span>
            </div>
            <div style={{ height: '6px', backgroundColor: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
              <div
                style={{
                  height: '100%',
                  width: `${progressRatio}%`,
                  backgroundColor: charCount > maxChars ? '#ef4444' : charCount >= 2000 ? '#10b981' : '#0284c7',
                  transition: 'width 0.2s ease',
                }}
              />
            </div>
          </div>
        </div>

        {/* 右側：問題作成 ＆ 履歴一覧 ＆ 提出ボタン */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* 文字サイズ調整 */}
          <div style={{ display: 'flex', alignItems: 'center', backgroundColor: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '3px 6px', gap: '4px' }}>
            <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#475569', marginRight: '2px' }}>🔍</span>
            {(['sm', 'base', 'lg', 'xl'] as FontSizeLevel[]).map((level) => {
              const isActive = fontSize === level;
              return (
                <button
                  key={level}
                  type="button"
                  onClick={() => setFontSize(level)}
                  style={{
                    padding: '2px 7px',
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

          {/* ➕ 問題作成ボタン（ポップアップを開く） */}
          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            style={{
              padding: '6px 12px',
              backgroundColor: '#0284c7',
              color: '#ffffff',
              fontSize: '12px',
              fontWeight: 'bold',
              borderRadius: '6px',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              boxShadow: '0 2px 4px rgba(2,132,199,0.3)',
            }}
          >
            ➕ 問題作成
          </button>

          <Link
            href="/dashboard"
            style={{
              padding: '6px 12px',
              backgroundColor: '#f8fafc',
              border: '1px solid #cbd5e1',
              color: '#334155',
              fontSize: '12px',
              fontWeight: 'bold',
              borderRadius: '6px',
              textDecoration: 'none',
            }}
          >
            📋 履歴一覧
          </Link>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            style={{
              padding: '7px 16px',
              backgroundColor: '#047857',
              color: '#ffffff',
              fontSize: '12px',
              fontWeight: 'bold',
              borderRadius: '6px',
              border: 'none',
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
              boxShadow: '0 2px 4px rgba(4,120,87,0.3)',
            }}
          >
            {isSubmitting ? '採点中...' : '🚀 答案提出・AI採点'}
          </button>
        </div>
      </header>

      {/* 2. メイン 2ペイン分割 */}
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'minmax(380px, 45%) minmax(420px, 55%)', height: 'calc(100vh - 120px)', overflow: 'hidden' }}>
        
        {/* 左ペイン：問題文 / 電子六法 */}
        <section style={{ backgroundColor: '#ffffff', borderRight: '2px solid #cbd5e1', display: 'flex', flexDirection: 'column', height: '100%' }}>
          <div style={{ display: 'flex', borderBottom: '2px solid #e2e8f0', backgroundColor: '#f8fafc', padding: '0 8px' }}>
            <button
              type="button"
              onClick={() => setActiveTab('problem')}
              style={{
                padding: '10px 18px',
                fontSize: '13px',
                fontWeight: 'bold',
                cursor: 'pointer',
                border: 'none',
                borderBottom: activeTab === 'problem' ? '3px solid #0284c7' : 'none',
                backgroundColor: activeTab === 'problem' ? '#ffffff' : 'transparent',
                color: activeTab === 'problem' ? '#0284c7' : '#64748b',
              }}
            >
              📄 問題文・事実
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('statute')}
              style={{
                padding: '10px 18px',
                fontSize: '13px',
                fontWeight: 'bold',
                cursor: 'pointer',
                border: 'none',
                borderBottom: activeTab === 'statute' ? '3px solid #0284c7' : 'none',
                backgroundColor: activeTab === 'statute' ? '#ffffff' : 'transparent',
                color: activeTab === 'statute' ? '#0284c7' : '#64748b',
              }}
            >
              📖 電子六法・参照条文
            </button>
          </div>

          <div style={{ flex: 1, padding: '20px', overflowY: 'auto', fontSize: fontSizes[fontSize].text, lineHeight: fontSizes[fontSize].lh }}>
            {activeTab === 'problem' ? (
              <div style={{ whiteSpace: 'pre-wrap', fontFamily: 'serif', color: '#1e293b' }}>
                {problem?.fact_context || '問題文を読み込み中...'}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', color: '#1e293b' }}>
                <div style={{ backgroundColor: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '14px' }}>
                  <h4 style={{ margin: '0 0 6px', fontSize: '14px', fontWeight: 'bold', color: '#0369a1' }}>
                    民法 第94条（虚偽表示）
                  </h4>
                  <p style={{ margin: 0, fontSize: '13px', lineHeight: '1.6' }}>
                    １ 相手方と通じてした虚偽の意思表示は、無効とする。<br />
                    ２ 前項の規定による意思表示の無効は、善意の第三者に対抗することができない。
                  </p>
                </div>

                <div style={{ backgroundColor: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '14px' }}>
                  <h4 style={{ margin: '0 0 6px', fontSize: '14px', fontWeight: 'bold', color: '#0369a1' }}>
                    民法 第110条（権限外の行為の表見代理）
                  </h4>
                  <p style={{ margin: 0, fontSize: '13px', lineHeight: '1.6' }}>
                    前条本文の規定は、代理人がその権限外の行為をした場合において、第三者が代理人の権限があると信ずべき正当な理由があるときについて準用する。
                  </p>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* 右ペイン：答案エディタ */}
        <section style={{ backgroundColor: '#f8fafc', display: 'flex', flexDirection: 'column', height: '100%' }}>
          <div style={{ padding: '8px 16px', backgroundColor: '#ffffff', borderBottom: '1px solid #cbd5e1', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#1e293b' }}>📝 答案エディタ</span>
              <span style={{ fontSize: '11px', color: '#64748b' }}>※Tabキーで全角スペース</span>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                onClick={() => setShowSearch(!showSearch)}
                style={{
                  padding: '3px 10px',
                  fontSize: '11px',
                  fontWeight: 'bold',
                  backgroundColor: showSearch ? '#e0f2fe' : '#ffffff',
                  color: showSearch ? '#0369a1' : '#475569',
                  border: '1px solid #cbd5e1',
                  borderRadius: '4px',
                  cursor: 'pointer',
                }}
              >
                🔍 検索・置換
              </button>
              
              <button
                type="button"
                onClick={() => setDraft('')}
                style={{
                  padding: '3px 10px',
                  fontSize: '11px',
                  fontWeight: 'bold',
                  backgroundColor: '#ffffff',
                  color: '#dc2626',
                  border: '1px solid #fca5a5',
                  borderRadius: '4px',
                  cursor: 'pointer',
                }}
              >
                クリア
              </button>
            </div>
          </div>

          {showSearch && (
            <div style={{ padding: '8px 16px', backgroundColor: '#e0f2fe', borderBottom: '1px solid #bae6fd', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px' }}>
              <input
                type="text"
                placeholder="検索文字..."
                value={searchWord}
                onChange={(e) => setSearchWord(e.target.value)}
                style={{ padding: '4px 8px', borderRadius: '4px', border: '1px solid #93c5fd', width: '130px' }}
              />
              <span>➔</span>
              <input
                type="text"
                placeholder="置換後..."
                value={replaceWord}
                onChange={(e) => setReplaceWord(e.target.value)}
                style={{ padding: '4px 8px', borderRadius: '4px', border: '1px solid #93c5fd', width: '130px' }}
              />
              <button
                type="button"
                onClick={handleReplace}
                style={{ padding: '4px 10px', backgroundColor: '#0284c7', color: '#ffffff', border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer' }}
              >
                置換実行
              </button>
            </div>
          )}

          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="ここに第１から順に答案を作成してください（Tabキーで1字下げができます）&#10;&#10;第１ Aの請求の可否&#10;１ ..."
            style={{
              flex: 1,
              width: '100%',
              padding: '20px',
              fontFamily: 'serif',
              fontSize: fontSizes[fontSize].text,
              lineHeight: fontSizes[fontSize].lh,
              border: 'none',
              outline: 'none',
              resize: 'none',
              backgroundColor: '#ffffff',
              color: '#0f172a',
            }}
          />
        </section>
      </div>

      {/* 3. 画面下部：AI講評 ＆ 合格アシスト */}
      <div style={{ borderTop: '2px solid #cbd5e1', backgroundColor: '#ffffff', boxShadow: '0 -2px 10px rgba(0,0,0,0.05)' }}>
        <div style={{ padding: '8px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8fafc', borderBottom: showAssist ? '1px solid #e2e8f0' : 'none' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              type="button"
              onClick={() => setShowAssist(!showAssist)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '5px 12px',
                backgroundColor: showAssist ? '#0284c7' : '#ffffff',
                color: showAssist ? '#ffffff' : '#0f172a',
                border: '1px solid #cbd5e1',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: 'bold',
                cursor: 'pointer',
              }}
            >
              <span>{showAssist ? '▼' : '▲'}</span>
              <span>合格思考アシスト（4ステップ・設計図・4色解剖）</span>
            </button>

            {feedback && (
              <span style={{ fontSize: '12px', color: '#b45309', fontWeight: 'bold' }}>
                ⚖️ AI採点結果が届いています
              </span>
            )}
          </div>

          {showAssist && (
            <div style={{ display: 'flex', gap: '6px' }}>
              <button
                type="button"
                onClick={() => setAssistTab('steps')}
                style={{ padding: '4px 10px', fontSize: '11px', fontWeight: 'bold', borderRadius: '4px', cursor: 'pointer', border: assistTab === 'steps' ? '1px solid #0284c7' : '1px solid #cbd5e1', backgroundColor: assistTab === 'steps' ? '#e0f2fe' : '#ffffff', color: assistTab === 'steps' ? '#0369a1' : '#475569' }}
              >
                1. 思考手順
              </button>
              <button
                type="button"
                onClick={() => setAssistTab('blueprint')}
                style={{ padding: '4px 10px', fontSize: '11px', fontWeight: 'bold', borderRadius: '4px', cursor: 'pointer', border: assistTab === 'blueprint' ? '1px solid #0284c7' : '1px solid #cbd5e1', backgroundColor: assistTab === 'blueprint' ? '#e0f2fe' : '#ffffff', color: assistTab === 'blueprint' ? '#0369a1' : '#475569' }}
              >
                2. あてはめ設計図
              </button>
              <button
                type="button"
                onClick={() => setAssistTab('anatomy')}
                style={{ padding: '4px 10px', fontSize: '11px', fontWeight: 'bold', borderRadius: '4px', cursor: 'pointer', border: assistTab === 'anatomy' ? '1px solid #0284c7' : '1px solid #cbd5e1', backgroundColor: assistTab === 'anatomy' ? '#e0f2fe' : '#ffffff', color: assistTab === 'anatomy' ? '#0369a1' : '#475569' }}
              >
                3. 4色アナトミー
              </button>
              <button
                type="button"
                onClick={() => setAssistTab('syllogism')}
                style={{ padding: '4px 10px', fontSize: '11px', fontWeight: 'bold', borderRadius: '4px', cursor: 'pointer', border: assistTab === 'syllogism' ? '1px solid #0284c7' : '1px solid #cbd5e1', backgroundColor: assistTab === 'syllogism' ? '#e0f2fe' : '#ffffff', color: assistTab === 'syllogism' ? '#0369a1' : '#475569' }}
              >
                4. 模範答案・三段論法
              </button>
            </div>
          )}
        </div>

        {showAssist && (
          <div style={{ padding: '20px', maxHeight: '340px', overflowY: 'auto', fontSize: fontSizes[fontSize].text, lineHeight: fontSizes[fontSize].lh }}>
            {assistTab === 'steps' && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px' }}>
                {(anatomy?.thinking_steps || []).map((st) => (
                  <div key={st.step} style={{ backgroundColor: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '14px' }}>
                    <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#0284c7', marginBottom: '4px' }}>
                      STEP {st.step}
                    </div>
                    <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#0f172a', marginBottom: '6px' }}>
                      {st.title}
                    </div>
                    <div style={{ fontSize: '12px', color: '#475569', lineHeight: '1.5' }}>
                      {st.description}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {assistTab === 'blueprint' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 'bold' }}>
                  問題文の「生の事実（青）」を判例規範の「法的評価（緑）」にぶつける設計図です：
                </div>
                {(anatomy?.application_blueprint || []).map((bp, idx) => (
                  <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', backgroundColor: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '12px' }}>
                    <div style={{ backgroundColor: '#e0f2fe', padding: '10px', borderRadius: '6px', border: '1px solid #bae6fd', fontSize: '12px', color: '#0369a1' }}>
                      <strong>【生の事実】</strong><br />{bp.fact}
                    </div>
                    <div style={{ backgroundColor: '#dcfce7', padding: '10px', borderRadius: '6px', border: '1px solid #bbf7d0', fontSize: '12px', color: '#166534' }}>
                      <strong>【法的評価・あてはめ】</strong><br />{bp.evaluation}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {assistTab === 'anatomy' && (
              <div>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', fontSize: '11px', fontWeight: 'bold' }}>
                  <span style={{ backgroundColor: '#dbeafe', color: '#1e40af', padding: '2px 8px', borderRadius: '4px' }}>条文・要件提起</span>
                  <span style={{ backgroundColor: '#dcfce7', color: '#166534', padding: '2px 8px', borderRadius: '4px' }}>趣旨・保護法益</span>
                  <span style={{ backgroundColor: '#fef3c7', color: '#92400e', padding: '2px 8px', borderRadius: '4px' }}>判例規範（定規）</span>
                  <span style={{ backgroundColor: '#fee2e2', color: '#991b1b', padding: '2px 8px', borderRadius: '4px' }}>事実と評価</span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '7fr 5fr', gap: '16px' }}>
                  <div style={{ fontFamily: 'serif', backgroundColor: '#f8fafc', padding: '14px', borderRadius: '8px', border: '1px solid #cbd5e1', lineHeight: '1.8' }}>
                    {(anatomy?.dissected_segments || []).map((seg, idx) => {
                      const colorMap: any = {
                        requirement: '#dbeafe',
                        purpose: '#dcfce7',
                        norm: '#fef3c7',
                        application: '#fee2e2',
                        conclusion: '#f1f5f9',
                      };
                      return (
                        <span
                          key={idx}
                          onClick={() => setSelectedAnnotation(seg.annotation)}
                          style={{
                            backgroundColor: colorMap[seg.type] || '#f1f5f9',
                            padding: '2px 4px',
                            margin: '0 2px',
                            borderRadius: '3px',
                            cursor: 'pointer',
                            borderBottom: '1px dashed #64748b',
                          }}
                        >
                          {seg.text}{' '}
                        </span>
                      );
                    })}
                  </div>

                  <div style={{ backgroundColor: '#ffffff', border: '2px solid #0284c7', borderRadius: '8px', padding: '14px' }}>
                    <h5 style={{ margin: '0 0 6px', fontSize: '12px', fontWeight: 'bold', color: '#0284c7' }}>
                      💡 各文の思考解説（左の文章をクリック）
                    </h5>
                    <p style={{ margin: 0, fontSize: '12px', color: '#334155', lineHeight: '1.6' }}>
                      {selectedAnnotation || '色付けされた文章をクリックすると、なぜその記述が合格答案に不可欠なのかの理由と配点ポイントが表示されます。'}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {assistTab === 'syllogism' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div style={{ backgroundColor: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <h4 style={{ margin: 0, fontSize: '13px', fontWeight: 'bold', color: '#0f172a' }}>骨格答案（構成案）</h4>
                    <button
                      type="button"
                      onClick={() => setDraft(draft + '\n' + (anatomy?.skeleton_answer || ''))}
                      style={{ padding: '3px 8px', fontSize: '11px', backgroundColor: '#e0f2fe', color: '#0369a1', border: '1px solid #bae6fd', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
                    >
                      エディタに挿入
                    </button>
                  </div>
                  <pre style={{ margin: 0, fontSize: '12px', whiteSpace: 'pre-wrap', fontFamily: 'serif', color: '#334155' }}>
                    {anatomy?.skeleton_answer || '骨格データを読み込み中...'}
                  </pre>
                </div>

                <div style={{ backgroundColor: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <h4 style={{ margin: 0, fontSize: '13px', fontWeight: 'bold', color: '#0f172a' }}>完全模範答案（写経用）</h4>
                    <button
                      type="button"
                      onClick={() => setDraft(anatomy?.full_model_answer || '')}
                      style={{ padding: '3px 8px', fontSize: '11px', backgroundColor: '#fef3c7', color: '#92400e', border: '1px solid #fde68a', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
                    >
                      写経用に丸ごと転記
                    </button>
                  </div>
                  <pre style={{ margin: 0, fontSize: '12px', whiteSpace: 'pre-wrap', fontFamily: 'serif', color: '#334155', maxHeight: '240px', overflowY: 'auto' }}>
                    {anatomy?.full_model_answer || '模範答案を読み込み中...'}
                  </pre>
                </div>
              </div>
            )}
          </div>
        )}

        {feedback && (
          <div style={{ padding: '16px 20px', backgroundColor: '#fffbeb', borderTop: '2px solid #fde68a' }}>
            <h4 style={{ margin: '0 0 8px', fontSize: '13px', fontWeight: 'bold', color: '#78350f' }}>
              ⚖️ AI採点・添削講評
            </h4>
            <div style={{ fontSize: fontSizes[fontSize].text, lineHeight: fontSizes[fontSize].lh, color: '#1e293b', whiteSpace: 'pre-wrap', maxHeight: '200px', overflowY: 'auto' }}>
              {feedback}
            </div>
          </div>
        )}
      </div>

      {/* ─── 4. 問題作成ポップアップ（モーダルダイアログ） ─── */}
      {showCreateModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(4px)',
            zIndex: 100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            boxSizing: 'border-box',
          }}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '16px',
              width: '100%',
              maxWidth: '640px',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              border: '1px solid #cbd5e1',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {/* モーダルヘッダー */}
            <div style={{ padding: '16px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8fafc' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '18px' }}>➕</span>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 'bold', color: '#0f172a' }}>
                  新規問題の作成・登録
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '20px',
                  color: '#64748b',
                  cursor: 'pointer',
                  padding: '4px',
                }}
              >
                ✕
              </button>
            </div>

            {/* モーダルフォーム */}
            <form onSubmit={handleCreateProblemSubmit} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* 科目 ＆ 出典 */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#475569', marginBottom: '4px' }}>
                    科目 <span style={{ color: '#dc2626' }}>*</span>
                  </label>
                  <select
                    value={newProblemForm.subject}
                    onChange={(e) => setNewProblemForm({ ...newProblemForm, subject: e.target.value })}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', backgroundColor: '#ffffff', color: '#0f172a', fontWeight: 'bold' }}
                  >
                    <option value="民法">民法</option>
                    <option value="刑法">刑法</option>
                    <option value="憲法">憲法</option>
                    <option value="民事訴訟法">民事訴訟法</option>
                    <option value="刑事訴訟法">刑事訴訟法</option>
                    <option value="商法">商法</option>
                    <option value="行政法">行政法</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#475569', marginBottom: '4px' }}>
                    出典・年度
                  </label>
                  <input
                    type="text"
                    value={newProblemForm.source_exam}
                    onChange={(e) => setNewProblemForm({ ...newProblemForm, source_exam: e.target.value })}
                    placeholder="例: 令和6年 予備試験 設問1"
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              {/* 論点 ＆ 制限時間 */}
              <div style={{ display: 'grid', gridTemplateColumns: '3fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#475569', marginBottom: '4px' }}>
                    論点・テーマ名 <span style={{ color: '#dc2626' }}>*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={newProblemForm.target_issue}
                    onChange={(e) => setNewProblemForm({ ...newProblemForm, target_issue: e.target.value })}
                    placeholder="例: 民法94条2項類推適用（意思外観対応型）"
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box', fontWeight: 'bold' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#475569', marginBottom: '4px' }}>
                    制限時間 (分)
                  </label>
                  <input
                    type="number"
                    value={newProblemForm.suggested_time_minutes}
                    onChange={(e) => setNewProblemForm({ ...newProblemForm, suggested_time_minutes: Number(e.target.value) })}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              {/* 問題文・事実 */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#475569', marginBottom: '4px' }}>
                  問題文・事実関係 <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <textarea
                  required
                  rows={6}
                  value={newProblemForm.fact_context}
                  onChange={(e) => setNewProblemForm({ ...newProblemForm, fact_context: e.target.value })}
                  placeholder="問題文を入力してください...&#10;１ Aは、自己の所有する甲土地について..."
                  style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box', fontFamily: 'serif', lineHeight: '1.6' }}
                />
              </div>

              {/* 判例規範（任意） */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#475569', marginBottom: '4px' }}>
                  標準規範・採点基準（任意）
                </label>
                <textarea
                  rows={3}
                  value={newProblemForm.standard_norm}
                  onChange={(e) => setNewProblemForm({ ...newProblemForm, standard_norm: e.target.value })}
                  placeholder="模範的な規範定立（AI採点時の採点基準として参照されます）"
                  style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', boxSizing: 'border-box', lineHeight: '1.5' }}
                />
              </div>

              {/* フッターアクションボタン */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px', paddingTop: '16px', borderTop: '1px solid #e2e8f0' }}>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    backgroundColor: '#ffffff',
                    color: '#475569',
                    fontSize: '13px',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                  }}
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  disabled={isCreatingProblem}
                  style={{
                    padding: '8px 20px',
                    borderRadius: '6px',
                    border: 'none',
                    backgroundColor: '#0284c7',
                    color: '#ffffff',
                    fontSize: '13px',
                    fontWeight: 'bold',
                    cursor: isCreatingProblem ? 'not-allowed' : 'pointer',
                    boxShadow: '0 2px 4px rgba(2,132,199,0.3)',
                  }}
                >
                  {isCreatingProblem ? '登録中...' : '💾 保存して起案を開始'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}