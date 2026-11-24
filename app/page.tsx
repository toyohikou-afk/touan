'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { supabase } from '../lib/supabase';

// === 既存システムと共通の文字サイズ状態定義 ===
type TextScale = 'normal' | 'medium' | 'large';

const textSizeStyles: Record<TextScale, { title: string; body: string; sub: string }> = {
  normal: {
    title: '18px',
    body: '15px',
    sub: '13px',
  },
  medium: {
    title: '21px',
    body: '18px',
    sub: '15px',
  },
  large: {
    title: '24px',
    body: '21px',
    sub: '17px',
  },
};

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
  const [textScale, setTextScale] = useState<TextScale>('normal');
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

  // 既存アプリと共通の localStorage キーから文字サイズを読み込み
  useEffect(() => {
    try {
      const savedScale = localStorage.getItem('yobi_text_scale') as TextScale;
      if (savedScale && textSizeStyles[savedScale]) {
        setTextScale(savedScale);
      }
    } catch (e) {
      console.error('文字サイズ読み込みエラー:', e);
    }
  }, []);

  const handleScaleChange = (scale: TextScale) => {
    setTextScale(scale);
    try {
      localStorage.setItem('yobi_text_scale', scale);
    } catch (e) {
      console.error('文字サイズ保存エラー:', e);
    }
  };

  // 弱点データの取得（復習期限が来ている順・定着度が低い順）
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

  // 復習結果（◯・△・✕）の記録と次回復習日の計算
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

  // 弱点データの削除
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

  const subjects = ['ALL', '民法', '民事実務', '商法', '民事訴訟法', '刑法', '刑事実務', '刑事訴訟法', '行政法', '憲法', '経済法'];
  const currentItem = items[currentIndex];
  const currentSize = textSizeStyles[textScale];

  return (
    <div style={{ fontFamily: 'sans-serif', padding: '15px', maxWidth: '800px', margin: 'auto', backgroundColor: '#f5f6fa', color: '#333', minHeight: '100vh', boxSizing: 'border-box' }}>
      
      {/* ヘッダー ＆ 文字サイズ切り替え ＆ タブ */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #e1e8ed', paddingBottom: '12px', marginBottom: '15px', flexWrap: 'wrap', gap: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <h2 style={{ fontSize: '22px', color: '#2c3e50', margin: 0 }}>🎯 2027予備試験 弱点DB</h2>
          <span style={{ fontSize: '12px', background: '#e3f2fd', color: '#0d47a1', padding: '3px 10px', borderRadius: '12px', fontWeight: 'bold' }}>
            登録: {items.length}件
          </span>
        </div>

        {/* 既存システムと完全同一の文字拡大ボタン */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: '#e1e8ed', padding: '3px 6px', borderRadius: '6px', border: '1px solid #b2bec3' }}>
          <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#555' }}>文字:</span>
          {(['normal', 'medium', 'large'] as TextScale[]).map((scale) => {
            const label = scale === 'normal' ? '標準' : scale === 'medium' ? '中' : '大';
            const isActive = textScale === scale;
            return (
              <button
                key={scale}
                onClick={() => handleScaleChange(scale)}
                style={{
                  padding: '2px 8px',
                  fontSize: '11px',
                  fontWeight: 'bold',
                  borderRadius: '4px',
                  border: 'none',
                  background: isActive ? '#4a69bd' : '#fff',
                  color: isActive ? '#fff' : '#333',
                  cursor: 'pointer',
                  boxShadow: isActive ? '0 1px 2px rgba(0,0,0,0.1)' : 'none',
                }}
              >
                {label}
              </button>
            );
          })}
        </div>

        {/* ナビゲーション・モード切替 */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
          <button
            onClick={() => setActiveTab('review')}
            style={{
              padding: '8px 14px',
              borderRadius: '6px',
              fontWeight: 'bold',
              cursor: 'pointer',
              background: activeTab === 'review' ? '#4a69bd' : '#fff',
              color: activeTab === 'review' ? '#fff' : '#4a69bd',
              border: '1px solid #4a69bd',
              fontSize: '13px',
            }}
          >
            スマホ復習カード
          </button>
          <button
            onClick={() => setActiveTab('import')}
            style={{
              padding: '8px 14px',
              borderRadius: '6px',
              fontWeight: 'bold',
              cursor: 'pointer',
              background: activeTab === 'import' ? '#4a69bd' : '#fff',
              color: activeTab === 'import' ? '#fff' : '#4a69bd',
              border: '1px solid #4a69bd',
              fontSize: '13px',
            }}
          >
            JSON一括登録
          </button>
          <Link #b2bec3', '#2c3e50', '#fff', '13px', '1px '6px', '8px 'bold', 'none', 12px', background: border: borderRadius: color: fontSize: fontWeight: href="/" padding: solid style="{{" textDecoration: }}>
            ← 学習トップへ
          </Link>
        </div>
      </div>

      {/* ================= 1. スマホ復習カードモード ================= */}
      {activeTab === 'review' && (
        <div>
          {/* 科目フィルターバー（既存デザイン統一） */}
          <div style={{ background: '#fff', padding: '12px', borderRadius: '10px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', marginBottom: '15px', display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center', justifyContent: 'space-between', border: '2px solid #4a69bd' }}>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
              <select
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value)}
                style={{ padding: '6px 10px', borderRadius: '5px', border: '1px solid #4a69bd', fontSize: '14px', background: '#fff', color: '#2c3e50', fontWeight: 'bold', cursor: 'pointer' }}
              >
                <option value="ALL">📚 すべての科目 ({items.length})</option>
                {subjects.filter((s) => s !== 'ALL').map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            {items.length > 0 && (
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <button
                  onClick={() => {
                    if (currentIndex > 0) {
                      setCurrentIndex(currentIndex - 1);
                      setShowAnswer(false);
                    }
                  }}
                  disabled={currentIndex === 0}
                  style={{ padding: '5px 12px', borderRadius: '5px', background: currentIndex === 0 ? '#dcdde1' : '#fff', color: currentIndex === 0 ? '#7f8fa6' : '#2c3e50', border: '1px solid #b2bec3', cursor: currentIndex === 0 ? 'not-allowed' : 'pointer', fontWeight: 'bold', fontSize: '13px' }}
                >
                  &lt; 前へ
                </button>
                <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#4a69bd' }}>
                  {currentIndex + 1} / {items.length}
                </span>
                <button
                  onClick={() => {
                    if (currentIndex < items.length - 1) {
                      setCurrentIndex(currentIndex + 1);
                      setShowAnswer(false);
                    }
                  }}
                  disabled={currentIndex === items.length - 1}
                  style={{ padding: '5px 12px', borderRadius: '5px', background: currentIndex === items.length - 1 ? '#dcdde1' : '#fff', color: currentIndex === items.length - 1 ? '#7f8fa6' : '#2c3e50', border: '1px solid #b2bec3', cursor: currentIndex === items.length - 1 ? 'not-allowed' : 'pointer', fontWeight: 'bold', fontSize: '13px' }}
                >
                  次へ &gt;
                </button>
              </div>
            )}
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px', fontWeight: 'bold', color: '#7f8fa6' }}>読み込み中...</div>
          ) : items.length === 0 ? (
            <div style={{ background: '#fff', padding: '30px', borderRadius: '12px', textAlign: 'center', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', border: '1px solid #dcdde1' }}>
              <p style={{ fontSize: '16px', fontWeight: 'bold', color: '#2c3e50', marginBottom: '10px' }}>
                登録されている弱点データがありません
              </p>
              <p style={{ fontSize: '14px', color: '#7f8fa6', marginBottom: '20px' }}>
                「JSON一括登録」タブからAI先生の弱点JSONを貼り付けて登録してください。
              </p>
              <button
                onClick={() => setActiveTab('import')}
                style={{ padding: '12px 24px', borderRadius: '8px', background: '#4a69bd', color: '#fff', border: 'none', fontWeight: 'bold', fontSize: '15px', cursor: 'pointer' }}
              >
                JSON一括登録画面へ
              </button>
            </div>
          ) : (
            /* 問題・解答カード（既存デザイン統一） */
            <div style={{ background: '#ffffff', padding: '20px', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', borderLeft: currentItem.mastery_level === 1 ? '5px solid #e84118' : currentItem.mastery_level === 2 ? '5px solid #fbc531' : '5px solid #44bd32' }}>
              {/* カード上部メタ情報 */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <span style={{ background: '#4a69bd', color: '#fff', fontSize: '12px', padding: '3px 10px', borderRadius: '4px', fontWeight: 'bold' }}>
                    {currentItem.subject}
                  </span>
                  <span style={{
                    fontSize: '12px',
                    padding: '3px 10px',
                    borderRadius: '4px',
                    fontWeight: 'bold',
                    background: currentItem.mastery_level === 1 ? '#fdedec' : currentItem.mastery_level === 2 ? '#fef9e7' : '#e8f8f5',
                    color: currentItem.mastery_level === 1 ? '#e84118' : currentItem.mastery_level === 2 ? '#d35400' : '#27ae60',
                    border: `1px solid ${currentItem.mastery_level === 1 ? '#fab1a0' : currentItem.mastery_level === 2 ? '#f9e79f' : '#a9dfbf'}`,
                  }}>
                    定着Lv.{currentItem.mastery_level}（復習 {currentItem.review_count}回）
                  </span>
                </div>

                <button
                  onClick={() => handleDeleteItem(currentItem.id)}
                  style={{ padding: '3px 8px', fontSize: '11px', background: '#fff', color: '#e84118', border: '1px solid #e84118', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
                >
                  削除
                </button>
              </div>

              {/* 論点タイトル */}
              <div style={{ marginBottom: '18px' }}>
                <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#7f8fa6', marginBottom: '4px' }}>【論点】</div>
                <h3 style={{ fontSize: currentSize.title, color: '#2c3e50', margin: 0, lineHeight: '1.5', fontWeight: 'bold' }}>
                  {currentItem.topic}
                </h3>
              </div>

              {!showAnswer ? (
                <div>
                  <div style={{ background: '#fff9e6', border: '1px solid #ffeaa7', borderRadius: '8px', padding: '14px', marginBottom: '16px', fontSize: currentSize.sub, color: '#634700', lineHeight: '1.6' }}>
                    頭の中で <strong>①保護法益（根っこ）→ ②判例の規範 → ③当てはめ・要件事実</strong> を30秒で想起してからボタンを押してください。
                  </div>
                  <button
                    onClick={() => setShowAnswer(true)}
                    style={{ width: '100%', padding: '15px', fontSize: '17px', border: 'none', borderRadius: '8px', background: '#4a69bd', color: 'white', cursor: 'pointer', fontWeight: 'bold', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}
                  >
                    法益・規範・当てはめを表示する
                  </button>
                </div>
              ) : (
                <div style={{ borderTop: '2px dashed #e1e8ed', paddingTop: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {/* ① 保護法益・趣旨 */}
                  <div style={{ background: '#e8f8f5', padding: '14px', borderRadius: '8px', borderLeft: '4px solid #2ecc71' }}>
                    <strong style={{ display: 'block', fontSize: currentSize.sub, color: '#1e8449', marginBottom: '6px' }}>
                      ① 保護法益・制度趣旨（根っこ）
                    </strong>
                    <div style={{ fontSize: currentSize.body, lineHeight: '1.7', color: '#2c3e50', whiteSpace: 'pre-wrap' }}>
                      {currentItem.legal_interest}
                    </div>
                  </div>

                  {/* ② 判例の規範定立 */}
                  <div style={{ background: '#f0f8ff', padding: '14px', borderRadius: '8px', borderLeft: '4px solid #4a69bd' }}>
                    <strong style={{ display: 'block', fontSize: currentSize.sub, color: '#2c3e50', marginBottom: '6px' }}>
                      ② 判例の規範定立（答案フレーズ）
                    </strong>
                    <div style={{ fontSize: currentSize.body, lineHeight: '1.7', color: '#2c3e50', fontWeight: 'bold', whiteSpace: 'pre-wrap' }}>
                      {currentItem.norm}
                    </div>
                  </div>

                  {/* ③ 当てはめの急所・実務視点 */}
                  <div style={{ background: '#fff5f5', padding: '14px', borderRadius: '8px', borderLeft: '4px solid #e84118' }}>
                    <strong style={{ display: 'block', fontSize: currentSize.sub, color: '#c0392b', marginBottom: '6px' }}>
                      ③ 当てはめの急所・実務視点・弱点メモ
                    </strong>
                    <div style={{ fontSize: currentSize.body, lineHeight: '1.7', color: '#2c3e50', whiteSpace: 'pre-wrap' }}>
                      {currentItem.application_points}
                    </div>
                  </div>

                  {/* 定着度評価ボタン */}
                  <div style={{ marginTop: '8px', paddingTop: '12px', borderTop: '1px solid #e1e8ed' }}>
                    <div style={{ textAlign: 'center', fontSize: '13px', fontWeight: 'bold', color: '#7f8fa6', marginBottom: '10px' }}>
                      今の想起レベルを記録して次の問題へ
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                      <button
                        onClick={() => handleRate(1)}
                        style={{ padding: '12px 6px', borderRadius: '8px', border: 'none', background: '#e84118', color: '#fff', fontWeight: 'bold', fontSize: '15px', cursor: 'pointer' }}
                      >
                        ✕ 曖昧<br />
                        <span style={{ fontSize: '11px', fontWeight: 'normal' }}>(Lv.1 すぐ再出題)</span>
                      </button>
                      <button
                        onClick={() => handleRate(2)}
                        style={{ padding: '12px 6px', borderRadius: '8px', border: 'none', background: '#f39c12', color: '#fff', fontWeight: 'bold', fontSize: '15px', cursor: 'pointer' }}
                      >
                        △ あと一歩<br />
                        <span style={{ fontSize: '11px', fontWeight: 'normal' }}>(Lv.2 2日後)</span>
                      </button>
                      <button
                        onClick={() => handleRate(3)}
                        style={{ padding: '12px 6px', borderRadius: '8px', border: 'none', background: '#44bd32', color: '#fff', fontWeight: 'bold', fontSize: '15px', cursor: 'pointer' }}
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
        <div style={{ background: '#fff', padding: '20px', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', border: '2px solid #4a69bd' }}>
          <h3 style={{ marginTop: 0, color: '#2c3e50', fontSize: '18px' }}>📥 AI先生の弱点JSONを一括登録</h3>
          <p style={{ fontSize: '14px', color: '#636e72', lineHeight: '1.6', marginBottom: '12px' }}>
            Geminiの「論文対策」AI先生が出力したJSON配列をそのまま貼り付けてください（前後の <code>```json</code> マークが付いたままでも自動で処理します）。
          </p>

          <textarea
            rows={10}
            value={jsonInput}
            onChange={(e) => setJsonInput(e.target.value)}
            placeholder='[ { "subject": "民法", "topic": "...", ... } ]'
            style={{ width: '100%', padding: '12px', fontSize: '13px', fontFamily: 'monospace', border: '1px solid #4a69bd', borderRadius: '8px', boxSizing: 'border-box', color: '#333', background: '#f8f9fa', marginBottom: '12px' }}
          />

          {importStatus && (
            <div
              style={{
                padding: '12px',
                borderRadius: '8px',
                marginBottom: '12px',
                fontWeight: 'bold',
                fontSize: '14px',
                background: importStatus.type === 'success' ? '#e8f8f5' : '#fdedec',
                color: importStatus.type === 'success' ? '#1e8449' : '#c0392b',
                border: `1px solid ${importStatus.type === 'success' ? '#a9dfbf' : '#fab1a0'}`,
              }}
            >
              {importStatus.msg}
            </div>
          )}

          <button
            onClick={handleImportJson}
            disabled={isImporting || !jsonInput.trim()}
            style={{
              width: '100%',
              padding: '14px',
              fontSize: '16px',
              border: 'none',
              borderRadius: '8px',
              background: isImporting || !jsonInput.trim() ? '#b2bec3' : '#e84118',
              color: 'white',
              cursor: isImporting || !jsonInput.trim() ? 'not-allowed' : 'pointer',
              fontWeight: 'bold',
            }}
          >
            {isImporting ? '登録中...' : 'Supabaseに一括登録する'}
          </button>
        </div>
      )}
    </div>
  );
}
