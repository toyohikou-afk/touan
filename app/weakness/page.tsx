'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

// === app/practice/page.tsx と完全共通の文字サイズ定義 ===
type FontSizeLevel = 'sm' | 'base' | 'lg' | 'xl';

const fontSizes: Record<FontSizeLevel, { title: string; text: string; sub: string; lh: string; label: string }> = {
  sm: { title: '16px', text: '13px', sub: '11px', lh: '1.6', label: '小' },
  base: { title: '18px', text: '15px', sub: '13px', lh: '1.75', label: '標準' },
  lg: { title: '21px', text: '17px', sub: '14px', lh: '1.85', label: '大' },
  xl: { title: '24px', text: '20px', sub: '16px', lh: '1.95', label: '特大' },
};

const SUBJECT_ORDER = [
  '憲法', '行政法', '民法', '商法', '民事訴訟法', '刑法', '刑事訴訟法',
  '民事実務', '刑事実務', '租税法', '経済法'
];

type Weakness = {
  id: string;
  subject: string;
  topic: string;
  legal_interest: string;
  norm: string;
  application_points: string;
  mastery_level: number;
  review_count: number;
  next_review_at: string;
};

export default function WeaknessReviewPage() {
  const [fontSize, setFontSize] = useState<FontSizeLevel>('base');
  const [adminQuery, setAdminQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'review' | 'import'>('review');

  const [items, setItems] = useState<Weakness[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<string>('ALL');
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [showAnswer, setShowAnswer] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  // JSONインポート用ステート
  const [jsonInput, setJsonInput] = useState<string>('');
  const [importStatus, setImportStatus] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [isImporting, setIsImporting] = useState<boolean>(false);

  // practiceページと共通の localStorage キー（touan_font_size）＆ adminクエリを引き継ぎ
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedFs = localStorage.getItem('touan_font_size') as FontSizeLevel;
      if (savedFs && fontSizes[savedFs]) {
        setFontSize(savedFs);
      }

      const params = new URLSearchParams(window.location.search);
      const admin = params.get('admin') || params.get('ADMIN');
      if (admin) {
        setAdminQuery(`?admin=${encodeURIComponent(admin)}`);
      }
    }
  }, []);

  const changeFontSize = (level: FontSizeLevel) => {
    setFontSize(level);
    if (typeof window !== 'undefined') {
      localStorage.setItem('touan_font_size', level);
    }
  };

  // 弱点データの取得（定着度が低い順・復習期限が来ている順）
  const fetchWeaknesses = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from('weaknesses')
      .select('*')
      .order('mastery_level', { ascending: true })
      .order('next_review_at', { ascending: true });

    if (selectedSubject !== 'ALL') {
      query = query.eq('subject', selectedSubject);
    }

    const { data, error } = await query;
    if (!error && data) {
      setItems(data);
      setCurrentIndex(0);
      setShowAnswer(false);
    }
    setLoading(false);
  }, [selectedSubject]);

  useEffect(() => {
    fetchWeaknesses();
  }, [fetchWeaknesses]);

  // 復習結果（✕・△・◯）の記録と次回復習日の更新
  const handleRate = async (newLevel: 1 | 2 | 3) => {
    const current = items[currentIndex];
    if (!current) return;

    const now = new Date();
    if (newLevel === 1) now.setHours(now.getHours() + 1);
    if (newLevel === 2) now.setDate(now.getDate() + 2);
    if (newLevel === 3) now.setDate(now.getDate() + 7);

    const { error } = await supabase
      .from('weaknesses')
      .update({
        mastery_level: newLevel,
        review_count: current.review_count + 1,
        next_review_at: now.toISOString(),
      })
      .eq('id', current.id);

    if (!error) {
      setShowAnswer(false);
      if (currentIndex + 1 < items.length) {
        setCurrentIndex((prev) => prev + 1);
      } else {
        fetchWeaknesses();
      }
    }
  };

  // 弱点カードの削除
  const handleDeleteItem = async (id: string) => {
    if (!confirm('この弱点カードをデータベースから削除しますか？')) return;
    const { error } = await supabase.from('weaknesses').delete().eq('id', id);
    if (!error) {
      const updated = items.filter((item) => item.id !== id);
      setItems(updated);
      setShowAnswer(false);
      if (currentIndex >= updated.length && currentIndex > 0) {
        setCurrentIndex(currentIndex - 1);
      }
    }
  };

  // AI先生が出力したJSONの一括登録処理
  const handleImportJson = async () => {
    setImportStatus(null);
    setIsImporting(true);
    try {
      const cleaned = jsonInput
        .replace(/^```json\s*/i, '')
        .replace(/^```\s*/i, '')
        .replace(/```\s*$/i, '')
        .trim();

      const parsed = JSON.parse(cleaned);
      if (!Array.isArray(parsed) || parsed.length === 0) {
        throw new Error('JSONは1件以上の配列形式（[ { ... } ]）である必要があります。');
      }

      const records = parsed.map((item) => ({
        subject: item.subject || '未分類',
        topic: item.topic || '無題の論点',
        legal_interest: item.legal_interest || '',
        norm: item.norm || '',
        application_points: item.application_points || '',
        mastery_level: Number(item.mastery_level) || 1,
      }));

      const { error } = await supabase.from('weaknesses').insert(records);
      if (error) throw error;

      setImportStatus({
        type: 'success',
        msg: `✅ ${records.length}件の弱点データをSupabaseに登録しました！`,
      });
      setJsonInput('');
      await fetchWeaknesses();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'JSONの解析または登録に失敗しました。';
      setImportStatus({ type: 'error', msg: `❌ ${message}` });
    } finally {
      setIsImporting(false);
    }
  };

  const currentItem = items[currentIndex];
  const currentFs = fontSizes[fontSize];

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f1f5f9', color: '#0f172a', display: 'flex', flexDirection: 'column', fontFamily: 'sans-serif' }}>
      
      {/* practiceページと完全統一したヘッダー */}
      <header style={{ minHeight: '48px', backgroundColor: '#ffffff', borderBottom: '1px solid #cbd5e1', padding: '8px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 1px 2px rgba(0,0,0,0.04)', flexWrap: 'wrap', gap: '8px', position: 'sticky', top: 0, zIndex: 20 }}>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '18px' }}>🎯</span>
          <span style={{ fontSize: '14px', fontWeight: '900', color: '#0f172a' }}>
            2027予備試験 弱点DB
          </span>
          <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '9999px', backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', color: '#1d4ed8', fontWeight: 'bold' }}>
            登録: {items.length}件
          </span>

          {/* タブ切り替え */}
          <div style={{ display: 'flex', gap: '4px', marginLeft: '4px' }}>
            <button
              type="button"
              onClick={() => setActiveTab('review')}
              style={{
                padding: '4px 10px',
                fontSize: '12px',
                fontWeight: 'bold',
                borderRadius: '6px',
                border: activeTab === 'review' ? '1.5px solid #2563eb' : '1px solid #cbd5e1',
                backgroundColor: activeTab === 'review' ? '#2563eb' : '#ffffff',
                color: activeTab === 'review' ? '#ffffff' : '#475569',
                cursor: 'pointer',
              }}
            >
              📱 スマホ復習
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('import')}
              style={{
                padding: '4px 10px',
                fontSize: '12px',
                fontWeight: 'bold',
                borderRadius: '6px',
                border: activeTab === 'import' ? '1.5px solid #2563eb' : '1px solid #cbd5e1',
                backgroundColor: activeTab === 'import' ? '#2563eb' : '#ffffff',
                color: activeTab === 'import' ? '#ffffff' : '#475569',
                cursor: 'pointer',
              }}
            >
              📥 JSON一括登録
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {/* practiceページと完全同一の文字拡大ボタン（小・標準・大・特大） */}
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

          <Link #bfdbfe', '#1d4ed8', '#eff6ff', '11px', '1px '4px '6px', 'bold', 'none', 10px', backgroundColor: border: borderRadius: color: fontSize: fontWeight: href="{`/practice${adminQuery}`}" padding: solid style="{{" textDecoration: }}>
            ⚖️ 論文起案へ戻る
          </Link>

          <Link #cbd5e1', '#334155', '#f8fafc', '11px', '1px '4px '6px', 'bold', 'none', 10px', backgroundColor: border: borderRadius: color: fontSize: fontWeight: href="{`/dashboard${adminQuery}`}" padding: solid style="{{" textDecoration: }}>
            📊 答案履歴
          </Link>
        </div>
      </header>

      {/* メインコンテンツエリア */}
      <main style={{ flex: 1, maxWidth: '820px', width: '100%', margin: '0 auto', padding: '16px', boxSizing: 'border-box' }}>
        
        {/* ================= 1. スマホ復習カードモード ================= */}
        {activeTab === 'review' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            
            {/* 科目フィルター＆ページ送りバー */}
            <div style={{ backgroundColor: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '10px', padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#64748b' }}>科目:</span>
                <select
                  value={selectedSubject}
                  onChange={(e) => setSelectedSubject(e.target.value)}
                  style={{
                    fontSize: '13px',
                    fontWeight: 'bold',
                    padding: '4px 10px',
                    borderRadius: '6px',
                    border: '1.5px solid #2563eb',
                    backgroundColor: '#eff6ff',
                    color: '#1d4ed8',
                    cursor: 'pointer',
                    outline: 'none',
                  }}
                >
                  <option value="ALL">全科目 ({items.length})</option>
                  {SUBJECT_ORDER.map((sub) => (
                    <option key={sub} value={sub}>{sub}</option>
                  ))}
                </select>
              </div>

              {items.length > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => {
                      if (currentIndex > 0) {
                        setCurrentIndex(currentIndex - 1);
                        setShowAnswer(false);
                      }
                    }}
                    disabled={currentIndex === 0}
                    style={{
                      padding: '4px 10px',
                      fontSize: '12px',
                      fontWeight: 'bold',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      backgroundColor: currentIndex === 0 ? '#f1f5f9' : '#ffffff',
                      color: currentIndex === 0 ? '#94a3b8' : '#0f172a',
                      cursor: currentIndex === 0 ? 'not-allowed' : 'pointer',
                    }}
                  >
                    &lt; 前へ
                  </button>
                  <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#1d4ed8' }}>
                    {currentIndex + 1} / {items.length}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      if (currentIndex < items.length - 1) {
                        setCurrentIndex(currentIndex + 1);
                        setShowAnswer(false);
                      }
                    }}
                    disabled={currentIndex === items.length - 1}
                    style={{
                      padding: '4px 10px',
                      fontSize: '12px',
                      fontWeight: 'bold',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      backgroundColor: currentIndex === items.length - 1 ? '#f1f5f9' : '#ffffff',
                      color: currentIndex === items.length - 1 ? '#94a3b8' : '#0f172a',
                      cursor: currentIndex === items.length - 1 ? 'not-allowed' : 'pointer',
                    }}
                  >
                    次へ &gt;
                  </button>
                </div>
              )}
            </div>

            {loading ? (
              <div style={{ textAlign: 'center', padding: '48px', fontWeight: 'bold', color: '#64748b' }}>
                読み込み中...
              </div>
            ) : items.length === 0 ? (
              <div style={{ backgroundColor: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '12px', padding: '32px', textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                <p style={{ fontSize: '16px', fontWeight: 'bold', color: '#0f172a', margin: '0 0 8px 0' }}>
                  該当する弱点データがありません
                </p>
                <p style={{ fontSize: '13px', color: '#64748b', margin: '0 0 18px 0' }}>
                  上の「📥 JSON一括登録」タブからAI先生の弱点JSONを貼り付けて登録してください。
                </p>
                <button
                  type="button"
                  onClick={() => setActiveTab('import')}
                  style={{
                    padding: '10px 20px',
                    backgroundColor: '#2563eb',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                  }}
                >
                  JSON一括登録画面へ
                </button>
              </div>
            ) : (
              /* 弱点カード本体 */
              <div style={{
                backgroundColor: '#ffffff',
                border: '1px solid #cbd5e1',
                borderLeft: currentItem.mastery_level === 1 ? '5px solid #dc2626' : currentItem.mastery_level === 2 ? '5px solid #d97706' : '5px solid #16a34a',
                borderRadius: '12px',
                padding: '20px',
                boxShadow: '0 2px 4px rgba(0,0,0,0.04)',
              }}>
                {/* カード上部バッジ */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <span style={{ backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', color: '#1d4ed8', fontSize: '12px', fontWeight: 'bold', padding: '2px 10px', borderRadius: '6px' }}>
                      {currentItem.subject}
                    </span>
                    <span style={{
                      fontSize: '12px',
                      fontWeight: 'bold',
                      padding: '2px 10px',
                      borderRadius: '6px',
                      backgroundColor: currentItem.mastery_level === 1 ? '#fef2f2' : currentItem.mastery_level === 2 ? '#fffbeb' : '#f0fdf4',
                      color: currentItem.mastery_level === 1 ? '#dc2626' : currentItem.mastery_level === 2 ? '#b45309' : '#15803d',
                      border: `1px solid ${currentItem.mastery_level === 1 ? '#fecaca' : currentItem.mastery_level === 2 ? '#fde68a' : '#bbf7d0'}`,
                    }}>
                      定着Lv.{currentItem.mastery_level}（復習 {currentItem.review_count}回）
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleDeleteItem(currentItem.id)}
                    style={{ padding: '3px 8px', backgroundColor: '#fff1f2', border: '1px solid #fecdd3', color: '#be123c', fontSize: '11px', fontWeight: 'bold', borderRadius: '6px', cursor: 'pointer' }}
                  >
                    🗑️ 削除
                  </button>
                </div>

                {/* 論点タイトル */}
                <div style={{ marginBottom: '18px' }}>
                  <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#64748b', marginBottom: '4px' }}>【論点】</div>
                  <h2 style={{ fontSize: currentFs.title, fontWeight: '900', color: '#0f172a', margin: 0, lineHeight: '1.5' }}>
                    {currentItem.topic}
                  </h2>
                </div>

                {!showAnswer ? (
                  <div>
                    <div style={{ backgroundColor: '#fffbeb', border: '1px solid #fde68a', borderRadius: '8px', padding: '14px', marginBottom: '16px', fontSize: currentFs.sub, color: '#92400e', lineHeight: '1.6' }}>
                      頭の中で <strong>①保護法益（根っこ）→ ②判例の規範 → ③当てはめ・要件事実</strong> を30秒で想起してからボタンを押してください。
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowAnswer(true)}
                      style={{
                        width: '100%',
                        padding: '14px',
                        fontSize: '16px',
                        fontWeight: 'bold',
                        border: 'none',
                        borderRadius: '8px',
                        backgroundColor: '#2563eb',
                        color: '#ffffff',
                        cursor: 'pointer',
                        boxShadow: '0 2px 4px rgba(37,99,235,0.2)',
                      }}
                    >
                      法益・規範・当てはめを表示する
                    </button>
                  </div>
                ) : (
                  <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    {/* ① 保護法益・制度趣旨 */}
                    <div style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderLeft: '4px solid #16a34a', borderRadius: '8px', padding: '14px' }}>
                      <strong style={{ display: 'block', fontSize: currentFs.sub, color: '#15803d', marginBottom: '6px' }}>
                        ① 保護法益・制度趣旨（根っこ）
                      </strong>
                      <div style={{ fontSize: currentFs.text, lineHeight: currentFs.lh, color: '#1e293b', whiteSpace: 'pre-wrap' }}>
                        {currentItem.legal_interest}
                      </div>
                    </div>

                    {/* ② 判例の規範定立 */}
                    <div style={{ backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', borderLeft: '4px solid #2563eb', borderRadius: '8px', padding: '14px' }}>
                      <strong style={{ display: 'block', fontSize: currentFs.sub, color: '#1e40af', marginBottom: '6px' }}>
                        ② 判例の規範定立（答案フレーズ）
                      </strong>
                      <div style={{ fontSize: currentFs.text, lineHeight: currentFs.lh, color: '#0f172a', fontWeight: 'bold', whiteSpace: 'pre-wrap', fontFamily: 'serif' }}>
                        {currentItem.norm}
                      </div>
                    </div>

                    {/* ③ 当てはめの急所・実務視点 */}
                    <div style={{ backgroundColor: '#fff1f2', border: '1px solid #fecdd3', borderLeft: '4px solid #e11d48', borderRadius: '8px', padding: '14px' }}>
                      <strong style={{ display: 'block', fontSize: currentFs.sub, color: '#9f1239', marginBottom: '6px' }}>
                        ③ 当てはめの急所・実務視点・弱点メモ
                      </strong>
                      <div style={{ fontSize: currentFs.text, lineHeight: currentFs.lh, color: '#1e293b', whiteSpace: 'pre-wrap' }}>
                        {currentItem.application_points}
                      </div>
                    </div>

                    {/* 定着度評価ボタン */}
                    <div style={{ marginTop: '6px', paddingTop: '14px', borderTop: '1px solid #e2e8f0' }}>
                      <div style={{ textAlign: 'center', fontSize: '12px', fontWeight: 'bold', color: '#64748b', marginBottom: '10px' }}>
                        今の想起レベルを記録して次のカードへ
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                        <button
                          type="button"
                          onClick={() => handleRate(1)}
                          style={{ padding: '12px 6px', borderRadius: '8px', border: 'none', backgroundColor: '#dc2626', color: '#ffffff', fontWeight: 'bold', fontSize: '14px', cursor: 'pointer' }}
                        >
                          ✕ 曖昧<br />
                          <span style={{ fontSize: '11px', fontWeight: 'normal' }}>(Lv.1 1時間後)</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRate(2)}
                          style={{ padding: '12px 6px', borderRadius: '8px', border: 'none', backgroundColor: '#d97706', color: '#ffffff', fontWeight: 'bold', fontSize: '14px', cursor: 'pointer' }}
                        >
                          △ あと一歩<br />
                          <span style={{ fontSize: '11px', fontWeight: 'normal' }}>(Lv.2 2日後)</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRate(3)}
                          style={{ padding: '12px 6px', borderRadius: '8px', border: 'none', backgroundColor: '#16a34a', color: '#ffffff', fontWeight: 'bold', fontSize: '14px', cursor: 'pointer' }}
                        >
                          ◯ 完璧！<br />
                          <span style={{ fontSize: '11px', fontWeight: 'normal' }}>(Lv.3 7日後)</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ================= 2. JSON一括登録モード ================= */}
        {activeTab === 'import' && (
          <div style={{ backgroundColor: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '12px', padding: '20px', boxShadow: '0 2px 4px rgba(0,0,0,0.04)' }}>
            <h3 style={{ margin: '0 0 8px 0', color: '#0f172a', fontSize: '16px', fontWeight: '900' }}>
              📥 AI先生の弱点JSONを一括登録
            </h3>
            <p style={{ fontSize: '13px', color: '#475569', lineHeight: '1.6', margin: '0 0 12px 0' }}>
              Geminiの「論文対策」AI先生が出力したJSON配列をそのまま貼り付けてください（前後の <code>```json</code> マークが付いたままでも自動で処理します）。
            </p>

            <textarea
              rows={10}
              value={jsonInput}
              onChange={(e) => setJsonInput(e.target.value)}
              placeholder='[ { "subject": "民法", "topic": "...", ... } ]'
              style={{
                width: '100%',
                padding: '12px',
                fontSize: '13px',
                fontFamily: 'monospace',
                border: '1px solid #cbd5e1',
                borderRadius: '8px',
                boxSizing: 'border-box',
                color: '#0f172a',
                backgroundColor: '#f8fafc',
                marginBottom: '12px',
                outline: 'none',
              }}
            />

            {importStatus && (
              <div
                style={{
                  padding: '10px 14px',
                  borderRadius: '8px',
                  marginBottom: '12px',
                  fontWeight: 'bold',
                  fontSize: '13px',
                  backgroundColor: importStatus.type === 'success' ? '#dcfce7' : '#fee2e2',
                  color: importStatus.type === 'success' ? '#166534' : '#991b1b',
                  border: `1px solid ${importStatus.type === 'success' ? '#86efac' : '#fecaca'}`,
                }}
              >
                {importStatus.msg}
              </div>
            )}

            <button
              type="button"
              onClick={handleImportJson}
              disabled={isImporting || !jsonInput.trim()}
              style={{
                width: '100%',
                padding: '13px',
                fontSize: '15px',
                border: 'none',
                borderRadius: '8px',
                backgroundColor: isImporting || !jsonInput.trim() ? '#94a3b8' : '#2563eb',
                color: '#ffffff',
                cursor: isImporting || !jsonInput.trim() ? 'not-allowed' : 'pointer',
                fontWeight: 'bold',
              }}
            >
              {isImporting ? '登録中...' : 'Supabaseに一括登録する'}
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
