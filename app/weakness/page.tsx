'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';

// 既存の環境変数をそのまま使用（インポートパス調整不要）
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

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

    // 定着度に応じた次回出題間隔（✕: 1時間後, △: 2日後, ◯: 7日後）
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

  // AI先生が出力したJSONの一括登録処理
  const handleImportJson = async () => {
    setImportStatus(null);
    setIsImporting(true);
    try {
      // コードブロック記号(```json ... ```)が含まれていても自動除去
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
        msg: `${records.length}件の弱点データをSupabaseに登録しました！`,
      });
      setJsonInput('');
      await fetchWeaknesses();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'JSONの解析または登録に失敗しました。';
      setImportStatus({ type: 'error', msg: message });
    } finally {
      setIsImporting(false);
    }
  };

  const subjects = ['ALL', '民法', '民事実務', '商法', '民事訴訟法', '刑法', '刑事実務', '刑事訴訟法', '行政法', '憲法', '経済法'];
  const currentItem = items[currentIndex];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-16">
      {/* ヘッダー＆タブ切り替え */}
      <header className="bg-slate-900 text-white px-4 py-4 sticky top-0 z-10 shadow-md">
        <div className="max-w-2xl mx-auto flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold tracking-tight">2027予備試験 弱点DB</h1>
            <span className="text-sm bg-slate-700 px-3 py-1 rounded-full">
              登録数: {items.length}件
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2 bg-slate-800 p-1 rounded-lg">
            <button
              onClick={() => setActiveTab('review')}
              className={`py-2.5 text-base font-bold rounded-md transition ${
                activeTab === 'review' ? 'bg-blue-600 text-white shadow' : 'text-slate-300'
              }`}
            >
              スマホ復習カード
            </button>
            <button
              onClick={() => setActiveTab('import')}
              className={`py-2.5 text-base font-bold rounded-md transition ${
                activeTab === 'import' ? 'bg-blue-600 text-white shadow' : 'text-slate-300'
              }`}
            >
              JSON一括登録
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 pt-5">
        {/* ================= 復習モード ================= */}
        {activeTab === 'review' && (
          <div className="space-y-4">
            {/* 科目フィルター */}
            <div className="flex gap-2 overflow-x-auto pb-2">
              {subjects.map((subj) => (
                <button
                  key={subj}
                  onClick={() => setSelectedSubject(subj)}
                  className={`px-3.5 py-1.5 rounded-full text-sm font-bold whitespace-nowrap border ${
                    selectedSubject === subj
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'bg-white text-slate-700 border-slate-300'
                  }`}
                >
                  {subj === 'ALL' ? '全科目' : subj}
                </button>
              ))}
            </div>

            {loading ? (
              <div className="text-center py-12 text-lg text-slate-500">読み込み中...</div>
            ) : items.length === 0 ? (
              <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 text-center space-y-4">
                <p className="text-lg font-bold text-slate-700">該当する弱点データがありません</p>
                <p className="text-base text-slate-500">
                  「JSON一括登録」タブからAI先生の出力データを登録してください。
                </p>
                <button
                  onClick={() => setActiveTab('import')}
                  className="bg-blue-600 text-white font-bold px-6 py-3 rounded-xl text-base"
                >
                  JSON登録画面へ
                </button>
              </div>
            ) : (
              /* 問題・解答カード */
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                {/* カード上部ステータス */}
                <div className="bg-slate-100 px-5 py-3 flex items-center justify-between border-b border-slate-200">
                  <div className="flex items-center gap-2">
                    <span className="bg-blue-100 text-blue-800 text-sm font-bold px-2.5 py-0.5 rounded">
                      {currentItem.subject}
                    </span>
                    <span className="text-sm font-semibold text-slate-600">
                      定着Lv.{currentItem.mastery_level}（復習{currentItem.review_count}回）
                    </span>
                  </div>
                  <span className="text-sm font-bold text-slate-500">
                    {currentIndex + 1} / {items.length}
                  </span>
                </div>

                {/* 問題（論点名） */}
                <div className="p-6">
                  <p className="text-sm font-bold text-slate-400 mb-1">【論点】</p>
                  <h2 className="text-2xl font-extrabold text-slate-900 leading-snug mb-6">
                    {currentItem.topic}
                  </h2>

                  {!showAnswer ? (
                    <div className="space-y-4">
                      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-base text-amber-900">
                        頭の中で<strong>①保護法益（根っこ）→ ②判例の規範 → ③当てはめ・要件事実</strong>を30秒で想起してからタップ！
                      </div>
                      <button
                        onClick={() => setShowAnswer(true)}
                        className="w-full py-4 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-lg font-bold rounded-xl shadow transition"
                      >
                        法益・規範・当てはめを表示
                      </button>
                    </div>
                  ) : (
                    /* 解答（法益 → 規範 → 当てはめ） */
                    <div className="space-y-5 border-t border-slate-200 pt-5">
                      <section className="bg-emerald-50/70 border-l-4 border-emerald-600 p-4 rounded-r-xl">
                        <h3 className="text-base font-extrabold text-emerald-900 mb-1">
                          ① 保護法益・制度趣旨（根っこ）
                        </h3>
                        <p className="text-lg leading-relaxed text-slate-800">
                          {currentItem.legal_interest}
                        </p>
                      </section>

                      <section className="bg-blue-50/70 border-l-4 border-blue-600 p-4 rounded-r-xl">
                        <h3 className="text-base font-extrabold text-blue-900 mb-1">
                          ② 判例の規範定立（答案フレーズ）
                        </h3>
                        <p className="text-lg leading-relaxed text-slate-800 font-medium">
                          {currentItem.norm}
                        </p>
                      </section>

                      <section className="bg-rose-50/70 border-l-4 border-rose-600 p-4 rounded-r-xl">
                        <h3 className="text-base font-extrabold text-rose-900 mb-1">
                          ③ 当てはめの急所・実務視点・弱点メモ
                        </h3>
                        <p className="text-lg leading-relaxed text-slate-800">
                          {currentItem.application_points}
                        </p>
                      </section>

                      {/* 定着度評価ボタン */}
                      <div className="pt-2">
                        <p className="text-center text-sm font-bold text-slate-500 mb-2">
                          今の想起レベルを記録して次のカードへ
                        </p>
                        <div className="grid grid-cols-3 gap-2.5">
                          <button
                            onClick={() => handleRate(1)}
                            className="py-3.5 bg-rose-600 text-white font-bold rounded-xl text-base shadow active:scale-95 transition"
                          >
                            ✕ 曖昧<br />
                            <span className="text-xs font-normal">(Lv.1 すぐ再出題)</span>
                          </button>
                          <button
                            onClick={() => handleRate(2)}
                            className="py-3.5 bg-amber-500 text-white font-bold rounded-xl text-base shadow active:scale-95 transition"
                          >
                            △ あと一歩<br />
                            <span className="text-xs font-normal">(Lv.2 2日後)</span>
                          </button>
                          <button
                            onClick={() => handleRate(3)}
                            className="py-3.5 bg-emerald-600 text-white font-bold rounded-xl text-base shadow active:scale-95 transition"
                          >
                            ◯ 完璧！<br />
                            <span className="text-xs font-normal">(Lv.3 7日後)</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ================= JSON一括登録モード ================= */}
        {activeTab === 'import' && (
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-4">
            <h2 className="text-xl font-bold text-slate-900">AI先生の弱点JSONを一括登録</h2>
            <p className="text-base text-slate-600 leading-relaxed">
              Geminiの「論文対策」AI先生が出力したJSON配列をそのまま貼り付けてください（前後の <code>```json</code> マークが付いたままでも自動で処理します）。
            </p>

            <textarea
              rows={10}
              value={jsonInput}
              onChange={(e) => setJsonInput(e.target.value)}
              placeholder='[ { "subject": "民法", "topic": "...", ... } ]'
              className="w-full p-4 border border-slate-300 rounded-xl font-mono text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />

            {importStatus && (
              <div
                className={`p-4 rounded-xl text-base font-bold ${
                  importStatus.type === 'success'
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-300'
                    : 'bg-rose-50 text-rose-800 border border-rose-300'
                }`}
              >
                {importStatus.msg}
              </div>
            )}

            <button
              onClick={handleImportJson}
              disabled={isImporting || !jsonInput.trim()}
              className="w-full py-4 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white text-lg font-bold rounded-xl shadow transition"
            >
              {isImporting ? '登録中...' : 'Supabaseに一括登録する'}
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
