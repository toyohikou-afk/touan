'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

// ==========================================
// 1. 型定義
// ==========================================
export type TabType = 'tando' | 'ronbun';
export type FontSize = 'normal' | 'medium' | 'large';
export type SubjectType = '民法' | '刑法' | '憲法' | '民事訴訟法' | '刑事訴訟法' | '商法' | '行政法';

export interface ApplicationElement {
  type: 'positive' | 'negative';
  raw_fact: string;
  legal_evaluation: string;
}

export interface LegalFlashcard {
  id: string;
  subject: SubjectType;
  theme: string;
  target_issue?: string;
  issue: {
    statute: string;
    problem: string;
  };
  purpose_rationale: string;
  criterion: string;
  judgment_factors: string[];
  application_elements: ApplicationElement[];
  conclusion: string;
}

const SUBJECT_COLORS: Record<SubjectType, { badge: string }> = {
  民法: { badge: 'bg-blue-100 text-blue-800 border-blue-200' },
  刑法: { badge: 'bg-rose-100 text-rose-800 border-rose-200' },
  憲法: { badge: 'bg-purple-100 text-purple-800 border-purple-200' },
  民事訴訟法: { badge: 'bg-sky-100 text-sky-800 border-sky-200' },
  刑事訴訟法: { badge: 'bg-amber-100 text-amber-800 border-amber-200' },
  商法: { badge: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  行政法: { badge: 'bg-indigo-100 text-indigo-800 border-indigo-200' },
};

export default function Home() {
  const [activeTab, setActiveTab] = useState<TabType>('ronbun');
  const [fontSize, setFontSize] = useState<FontSize>('normal');

  // 短答用ステート
  const [selectedYear, setSelectedYear] = useState<string>('ALL');
  const [selectedSubjectTando, setSelectedSubjectTando] = useState<string>('ALL');
  const [onlyFrequent, setOnlyFrequent] = useState<boolean>(false);
  const [onlyWrong, setOnlyWrong] = useState<boolean>(false);

  // 論文カード用ステート（Supabase連携）
  const [cards, setCards] = useState<LegalFlashcard[]>([]);
  const [loadingCards, setLoadingCards] = useState<boolean>(true);
  const [errorCards, setErrorCards] = useState<string | null>(null);
  const [selectedSubjectRonbun, setSelectedSubjectRonbun] = useState<string>('ALL');
  const [currentCardIndex, setCurrentCardIndex] = useState<number>(0);
  const [cardSide, setCardSide] = useState<'front' | 'back'>('front');

  // Supabaseからのデータfetch関数
  const fetchCards = useCallback(async () => {
    try {
      setLoadingCards(true);
      setErrorCards(null);

      let query = supabase.from('ronsho_cards').select('*').order('created_at', { ascending: false });

      if (selectedSubjectRonbun !== 'ALL') {
        query = query.eq('subject', selectedSubjectRonbun);
      }

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      if (data) {
        // 新旧全カラム名を網羅してマッピング（論点・規範・当てはめ基準の欠損を完全ガード）
        const formattedCards: LegalFlashcard[] = data.map((item: any) => ({
          id: item.id,
          subject: (item.subject as SubjectType) || '民法',
          theme: item.theme || item.target_issue || item.title || '（論点未設定）',
          target_issue: item.target_issue || item.theme || '（論点未設定）',
          issue: {
            statute: item.statute || '条文未設定',
            problem: item.problem || item.fact_context || '問題の所在未設定',
          },
          purpose_rationale: item.purpose_rationale || item.purpose || '',
          criterion: item.criterion || item.norm || item.standard_norm || '（規範データなし）',
          judgment_factors: Array.isArray(item.judgment_factors) && item.judgment_factors.length > 0
            ? item.judgment_factors
            : Array.isArray(item.criteria) && item.criteria.length > 0
            ? item.criteria
            : Array.isArray(item.judgment_criteria) && item.judgment_criteria.length > 0
            ? item.judgment_criteria
            : [],
          application_elements: Array.isArray(item.application_elements) ? item.application_elements : [],
          conclusion: item.conclusion || '',
        }));

        setCards(formattedCards);
        setCurrentCardIndex(0);
        setCardSide('front');
      }
    } catch (err: any) {
      console.error('論証カード取得エラー:', err);
      setErrorCards('カードデータの取得に失敗しました: ' + (err.message || '通信エラー'));
    } finally {
      setLoadingCards(false);
    }
  }, [selectedSubjectRonbun]);

  useEffect(() => {
    if (activeTab === 'ronbun') {
      fetchCards();
    }
  }, [fetchCards, activeTab]);

  const fontSizeClass = {
    normal: 'text-sm',
    medium: 'text-base',
    large: 'text-lg',
  }[fontSize];

  const activeCard = cards[currentCardIndex] || null;

  return (
    <div className={`min-h-screen bg-[#f5f6fa] text-[#2c3e50] p-4 sm:p-6 transition-all ${fontSizeClass}`}>
      <div className="max-w-4xl mx-auto space-y-4">

        {/* ========== ヘッダーナビゲーション ========== */}
        <header className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <h1 className="text-xl sm:text-2xl font-black text-[#2c3e50] tracking-tight">
              予備試験 学習システム
            </h1>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {/* 文字サイズ調整 */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-300">
              <span className="text-xs font-bold text-slate-600 px-1.5">文字:</span>
              {(['normal', 'medium', 'large'] as FontSize[]).map((size) => (
                <button
                  key={size}
                  onClick={() => setFontSize(size)}
                  className={`px-2 py-0.5 text-xs font-bold rounded transition-all ${
                    fontSize === size
                      ? 'bg-[#4a69bd] text-white shadow-sm'
                      : 'bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {size === 'normal' ? '標準' : size === 'medium' ? '中' : '大'}
                </button>
              ))}
            </div>

            {/* モード切替タブ */}
            <div className="flex gap-1.5">
              <button
                onClick={() => setActiveTab('tando')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                  activeTab === 'tando'
                    ? 'bg-[#4a69bd] text-white border-[#4a69bd] shadow-sm'
                    : 'bg-white text-[#4a69bd] border-slate-200 hover:border-[#4a69bd]'
                }`}
              >
                短答過去問 (yobi_db)
              </button>
              <button
                onClick={() => setActiveTab('ronbun')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                  activeTab === 'ronbun'
                    ? 'bg-[#4a69bd] text-white border-[#4a69bd] shadow-sm'
                    : 'bg-white text-[#4a69bd] border-slate-200 hover:border-[#4a69bd]'
                }`}
              >
                論文・論証カード (anki)
              </button>
            </div>

            {/* CBT起案室（practice）へのリンク */}
            <Link
              href="/practice"
              className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-[#047857] hover:bg-[#065f46] text-white transition-all shadow-sm flex items-center gap-1"
            >
              ✍️️ CBT起案室へ
            </Link>
          </div>
        </header>

        {/* ========== 短答過去問モード ========== */}
        {activeTab === 'tando' && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div className="bg-white p-3.5 rounded-xl shadow-sm border-2 border-[#4a69bd] flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 flex-wrap">
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                  className="px-3 py-1.5 rounded-lg border border-[#4a69bd] text-xs font-bold bg-white text-[#2c3e50] outline-none"
                >
                  <option value="ALL">📅 すべての年度</option>
                  <option value="R06">令和6年</option>
                  <option value="R05">令和5年</option>
                </select>

                <select
                  value={selectedSubjectTando}
                  onChange={(e) => setSelectedSubjectTando(e.target.value)}
                  className="px-3 py-1.5 rounded-lg border border-[#4a69bd] text-xs font-bold bg-white text-[#2c3e50] outline-none"
                >
                  <option value="ALL">📚 すべての科目</option>
                  <option value="民法">民法</option>
                  <option value="刑法">刑法</option>
                  <option value="憲法">憲法</option>
                  <option value="民事訴訟法">民事訴訟法</option>
                  <option value="刑事訴訟法">刑事訴訟法</option>
                  <option value="商法">商法</option>
                  <option value="行政法">行政法</option>
                </select>
              </div>

              <div className="flex items-center gap-3">
                <label className="text-xs font-bold text-[#2c3e50] flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={onlyFrequent}
                    onChange={(e) => setOnlyFrequent(e.target.checked)}
                    className="rounded text-[#4a69bd]"
                  />
                  ⭐ 頻出
                </label>
                <label className="text-xs font-bold text-[#e84118] flex items-center gap-1.5 cursor-pointer bg-red-50 px-2 py-1 rounded-md">
                  <input
                    type="checkbox"
                    checked={onlyWrong}
                    onChange={(e) => setOnlyWrong(e.target.checked)}
                    className="rounded text-[#e84118]"
                  />
                  ❌ 間違えた問題 (0)
                </label>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-400 font-bold">
              短答データベース (yobi_db) 接続中...
            </div>
          </div>
        )}

        {/* ========== 論文・論証カードモード（Supabase連携） ========== */}
        {activeTab === 'ronbun' && (
          <div className="space-y-4 animate-in fade-in duration-200">
            {/* 操作バー */}
            <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <select
                  value={selectedSubjectRonbun}
                  onChange={(e) => setSelectedSubjectRonbun(e.target.value)}
                  className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-bold bg-white text-[#2c3e50] outline-none"
                >
                  <option value="ALL">📚 すべての科目</option>
                  <option value="民法">民法</option>
                  <option value="刑法">刑法</option>
                  <option value="憲法">憲法</option>
                  <option value="民事訴訟法">民事訴訟法</option>
                  <option value="刑事訴訟法">刑事訴訟法</option>
                  <option value="商法">商法</option>
                  <option value="行政法">行政法</option>
                </select>
                <span className="text-xs text-slate-500 font-medium">
                  {cards.length > 0 ? `${currentCardIndex + 1} / ${cards.length} 件` : '0 件'}
                </span>
              </div>

              {cards.length > 0 && (
                <div className="flex bg-slate-100 p-1 rounded-lg">
                  <button
                    onClick={() => setCardSide('front')}
                    className={`px-3 py-1 rounded text-xs font-bold transition-all ${
                      cardSide === 'front'
                        ? 'bg-white text-[#2c3e50] shadow-sm'
                        : 'text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    表面：規範・論証
                  </button>
                  <button
                    onClick={() => setCardSide('back')}
                    className={`px-3 py-1 rounded text-xs font-bold transition-all ${
                      cardSide === 'back'
                        ? 'bg-white text-[#2c3e50] shadow-sm'
                        : 'text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    裏面：事実・法的評価
                  </button>
                </div>
              )}
            </div>

            {/* ローディング表示 */}
            {loadingCards && (
              <div className="bg-white rounded-2xl border border-slate-200 p-16 text-center text-slate-400 font-bold flex flex-col items-center justify-center gap-3">
                <div className="w-8 h-8 border-4 border-[#4a69bd] border-t-transparent rounded-full animate-spin"></div>
                <span>Supabaseから論証カードを読み込み中...</span>
              </div>
            )}

            {/* エラー表示 */}
            {!loadingCards && errorCards && (
              <div className="bg-rose-50 border border-rose-200 p-6 rounded-2xl text-center text-rose-700">
                <p className="font-bold text-sm mb-2">{errorCards}</p>
                <button
                  onClick={fetchCards}
                  className="px-4 py-1.5 bg-rose-600 text-white rounded-lg text-xs font-bold hover:bg-rose-700"
                >
                  再読み込み
                </button>
              </div>
            )}

            {/* データ0件時 */}
            {!loadingCards && !errorCards && cards.length === 0 && (
              <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400 font-bold">
                該当する論証カードが登録されていません。
              </div>
            )}

            {/* カード表示本体 */}
            {!loadingCards && !errorCards && activeCard && (
              <div className="bg-white rounded-2xl border-2 border-slate-200 shadow-sm overflow-hidden">
                <div className="p-5 border-b border-slate-100 bg-slate-50/50">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className={`px-2.5 py-0.5 rounded text-[11px] font-black border ${SUBJECT_COLORS[activeCard.subject]?.badge || 'bg-slate-100 text-slate-800'}`}>
                        {activeCard.subject}
                      </span>
                      <span className="text-xs font-mono font-bold text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
                        {activeCard.issue.statute}
                      </span>
                    </div>
                    <span className="text-xs font-bold text-slate-400">
                      {cardSide === 'front' ? '【規範インプット】' : '【あてはめ思考訓練】'}
                    </span>
                  </div>
                  <h2 className="text-base sm:text-lg font-black text-[#2c3e50]">
                    {activeCard.theme || activeCard.target_issue || '（論点未設定）'}
                  </h2>
                </div>

                <div className="p-5 sm:p-6 min-h-[340px]">
                  {cardSide === 'front' ? (
                    /* 表面 */
                    <div className="space-y-4">
                      <div className="bg-amber-50/60 border border-amber-200 p-3.5 rounded-xl">
                        <div className="text-[11px] font-black text-amber-800 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                          問題の所在・条文の限界
                        </div>
                        <p className="text-slate-800 font-medium leading-relaxed">
                          {activeCard.issue.problem}
                        </p>
                      </div>

                      <div>
                        <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                          制度趣旨・指導理念
                        </div>
                        <p className="text-slate-700 leading-relaxed font-normal">
                          {activeCard.purpose_rationale}
                        </p>
                      </div>

                      <div className="bg-blue-50/70 border border-blue-200 p-4 rounded-xl">
                        <div className="text-[11px] font-black text-[#4a69bd] uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-[#4a69bd]"></span>
                          判例の規範定立（答案用）
                        </div>
                        <p className="text-slate-900 font-bold leading-relaxed">
                          {activeCard.criterion}
                        </p>
                      </div>
                    </div>
                  ) : (
                    /* 裏面 */
                    <div className="space-y-4">
                      <div>
                        <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                          裁判所の当てはめ基準（考慮要素）
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {activeCard.judgment_factors.map((factor, i) => (
                            <span key={i} className="text-xs px-2.5 py-1 rounded bg-slate-100 text-slate-700 border border-slate-200 font-medium">
                              • {factor}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div>
                        <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                          問題文の事実 × 法的評価（答案表現）
                        </div>
                        <div className="space-y-2">
                          {activeCard.application_elements.map((item, i) => {
                            const isPos = item.type === 'positive';
                            return (
                              <div key={i} className="grid grid-cols-1 md:grid-cols-12 gap-2 p-3 rounded-xl border border-slate-200 bg-slate-50/60 text-xs">
                                <div className="md:col-span-5 flex flex-col justify-center">
                                  <div className="flex items-center gap-1.5 mb-1">
                                    <span className={`px-1.5 py-0.5 text-[10px] font-black rounded ${isPos ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                                      {isPos ? '充足方向' : '反論・減軽'}
                                    </span>
                                    <span className="text-slate-400 font-bold">客観的事実</span>
                                  </div>
                                  <p className="text-slate-800 font-medium leading-snug">
                                    {item.raw_fact}
                                  </p>
                                </div>

                                <div className="hidden md:flex md:col-span-1 items-center justify-center font-bold text-slate-300">
                                  →
                                </div>

                                <div className="md:col-span-6 bg-white p-2.5 rounded-lg border border-slate-200/80 flex flex-col justify-center">
                                  <span className="text-slate-400 font-bold text-[10px] mb-0.5">答案での法的評価</span>
                                  <p className="text-slate-900 font-bold leading-snug">
                                    {item.legal_evaluation}
                                  </p>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      <div className="bg-[#2c3e50] text-white p-3.5 rounded-xl">
                        <div className="text-[10px] font-bold text-slate-300 uppercase tracking-wider mb-0.5">
                          法的帰趨・結論
                        </div>
                        <p className="text-xs sm:text-sm font-bold leading-relaxed">
                          {activeCard.conclusion}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* カードフッター操作ボタン */}
                <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                  <button
                    onClick={() => setCardSide((prev) => (prev === 'front' ? 'back' : 'front'))}
                    className="text-xs font-bold text-[#4a69bd] hover:underline flex items-center gap-1"
                  >
                    🔄 {cardSide === 'front' ? '裏面（あてはめ）を見る' : '表面（規範）に戻る'}
                  </button>

                  <div className="flex gap-2">
                    <button
                      disabled={currentCardIndex === 0}
                      onClick={() => {
                        setCurrentCardIndex((i) => Math.max(0, i - 1));
                        setCardSide('front');
                      }}
                      className="px-3 py-1 rounded bg-white border border-slate-300 text-xs font-bold text-slate-700 disabled:opacity-40"
                    >
                      前へ
                    </button>
                    <button
                      disabled={currentCardIndex === cards.length - 1}
                      onClick={() => {
                        setCurrentCardIndex((i) => Math.min(cards.length - 1, i + 1));
                        setCardSide('front');
                      }}
                      className="px-3 py-1 rounded bg-[#4a69bd] text-white text-xs font-bold disabled:opacity-40"
                    >
                      次へ
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}