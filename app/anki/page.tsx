'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface AnkiCard {
  id: string;
  subject?: string;
  theme?: string;
  question: string;
  answer: string;
  logic_rule?: string;
  reference?: string;
  importance?: string;
  tags?: string[];
  created_at?: string;
}

export default function AnkiPage() {
  const [cards, setCards] = useState<AnkiCard[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [loading, setLoading] = useState(true);

  const [adminKey, setAdminKey] = useState<string | null>(null);
  const isAdmin = Boolean(adminKey);

  // 入力フォーム状態
  const [editingCard, setEditingCard] = useState<AnkiCard | null>(null);
  const [theme, setTheme] = useState('');
  const [question, setQuestion] = useState('');
  const [logicRule, setLogicRule] = useState('');
  const [answer, setAnswer] = useState('');
  const [reference, setReference] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const key = params.get('admin');
    if (key) setAdminKey(key);
    fetchCards();
  }, []);

  const fetchCards = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('anki')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('カード取得エラー:', error.message);
    } else if (data) {
      setCards(data);
    }
    setLoading(false);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminKey || !question.trim() || !answer.trim()) return;

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/anki?admin=${encodeURIComponent(adminKey)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: '刑法',
          theme: theme || '重要論点',
          question,
          answer,
          logic_rule: logicRule,
          reference,
          importance: 'A',
          tags: [theme || '刑法']
        }),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || '作成に失敗しました');

      alert('カードを新規登録しました！');
      resetForm();
      await fetchCards();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'エラーが発生しました');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminKey || !editingCard) return;

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/anki?admin=${encodeURIComponent(adminKey)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingCard.id,
          theme,
          question,
          answer,
          logic_rule: logicRule,
          reference,
        }),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || '更新に失敗しました');

      alert('カードを更新しました！');
      resetForm();
      await fetchCards();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'エラーが発生しました');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!adminKey) return;
    if (!window.confirm('このカードを削除しますか？')) return;

    try {
      const res = await fetch(`/api/anki?admin=${encodeURIComponent(adminKey)}&id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || '削除に失敗しました');

      alert('カードを削除しました。');
      if (currentIndex >= cards.length - 1 && currentIndex > 0) {
        setCurrentIndex(currentIndex - 1);
      }
      await fetchCards();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'エラーが発生しました');
    }
  };

  const resetForm = () => {
    setEditingCard(null);
    setTheme('');
    setQuestion('');
    setLogicRule('');
    setAnswer('');
    setReference('');
  };

  const startEditing = (card: AnkiCard) => {
    setEditingCard(card);
    setTheme(card.theme || '');
    setQuestion(card.question || '');
    setLogicRule(card.logic_rule || '');
    setAnswer(card.answer || '');
    setReference(card.reference || '');
    window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
  };

  const currentCard = cards[currentIndex];

  if (loading) {
    return <div className="p-8 text-center text-slate-500">カードを読み込み中...</div>;
  }

  return (
    <div className="min-h-screen bg-slate-100 py-10 px-4 text-slate-800">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center justify-between border-b border-slate-200 pb-4">
          <div>
            <h1 className="text-2xl font-black text-slate-900">予備試験・司法試験 暗記カード</h1>
            <p className="text-xs text-slate-500">判例規範定立・あてはめ基準定着ドリル</p>
          </div>
          <div>
            {isAdmin ? (
              <span className="px-3 py-1 bg-emerald-100 text-emerald-800 text-xs font-bold rounded-full border border-emerald-300">
                ● 管理者モード中
              </span>
            ) : (
              <span className="px-3 py-1 bg-slate-200 text-slate-600 text-xs font-medium rounded-full">
                閲覧専用モード
              </span>
            )}
          </div>
        </div>

        {cards.length > 0 && currentCard ? (
          <div className="space-y-4">
            <div className="flex justify-between items-center text-xs text-slate-500 font-bold">
              <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded border border-blue-200">
                {currentCard.theme || currentCard.subject || '刑法'}
              </span>
              <span>{currentIndex + 1} / {cards.length}</span>
            </div>

            <div
              onClick={() => setIsFlipped(!isFlipped)}
              className="min-h-[280px] p-6 bg-white border border-slate-300 rounded-2xl shadow-sm cursor-pointer flex flex-col justify-between hover:border-blue-400 transition"
            >
              <div className="space-y-4">
                <span className="text-xs font-bold px-2 py-0.5 bg-slate-100 rounded text-slate-600 inline-block">
                  {isFlipped ? '【答案直結：規範定立・解答】' : '【論点・問いかけ】'}
                </span>

                {!isFlipped ? (
                  <div className="text-base font-bold text-slate-900 leading-relaxed whitespace-pre-wrap">
                    {currentCard.question}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {currentCard.logic_rule && (
                      <div className="p-3 bg-amber-50 border-l-4 border-amber-500 rounded text-xs leading-relaxed text-amber-950 font-medium">
                        <span className="font-bold block mb-1">【判例規範・当てはめ基準】</span>
                        {currentCard.logic_rule}
                      </div>
                    )}
                    <div className="text-sm font-medium leading-relaxed whitespace-pre-wrap text-slate-800">
                      {currentCard.answer}
                    </div>
                    {currentCard.reference && (
                      <div className="text-xs text-slate-400 mt-2">
                        参照: {currentCard.reference}
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div className="text-right text-xs text-slate-400">
                クリックで反転
              </div>
            </div>

            <div className="flex items-center justify-between gap-2">
              <div className="flex gap-2">
                <button
                  disabled={currentIndex === 0}
                  onClick={() => { setCurrentIndex(currentIndex - 1); setIsFlipped(false); }}
                  className="px-4 py-2 bg-white border border-slate-300 rounded-lg text-xs font-bold disabled:opacity-40"
                >
                  前へ
                </button>
                <button
                  disabled={currentIndex === cards.length - 1}
                  onClick={() => { setCurrentIndex(currentIndex + 1); setIsFlipped(false); }}
                  className="px-4 py-2 bg-white border border-slate-300 rounded-lg text-xs font-bold disabled:opacity-40"
                >
                  次へ
                </button>
              </div>

              {isAdmin && (
                <div className="flex gap-2">
                  <button
                    onClick={() => startEditing(currentCard)}
                    className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-lg shadow-sm"
                  >
                    編集
                  </button>
                  <button
                    onClick={() => handleDelete(currentCard.id)}
                    className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg shadow-sm"
                  >
                    削除
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="p-8 text-center bg-white border rounded-xl text-slate-500">
            登録されているカードがありません。下のフォームから登録してください。
          </div>
        )}

        {isAdmin && (
          <div className="mt-10 p-6 bg-white border-2 border-slate-300 rounded-2xl shadow-sm space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-sm font-bold text-slate-800">
                {editingCard ? `カードの編集` : '新しい暗記カードの作成'}
              </h2>
              {editingCard && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="text-xs text-slate-400 hover:text-slate-600 underline"
                >
                  編集をキャンセル
                </button>
              )}
            </div>

            <form onSubmit={editingCard ? handleUpdate : handleCreate} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">論点テーマ (theme)</label>
                <input
                  type="text"
                  value={theme}
                  onChange={(e) => setTheme(e.target.value)}
                  placeholder="例: 強盗利得罪における処分行為の要否"
                  className="w-full p-2 text-xs border rounded-lg bg-slate-50"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">問題・問いかけ (question)</label>
                <textarea
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder="例: 2項強盗罪（236条2項）の成立に被害者の処分行為は必要か。"
                  rows={2}
                  required
                  className="w-full p-2 text-xs border rounded-lg bg-slate-50"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-amber-800 mb-1">
                  判例規範・当てはめ基準 (logic_rule) ※答案直結
                </label>
                <textarea
                  value={logicRule}
                  onChange={(e) => setLogicRule(e.target.value)}
                  placeholder="例: 【規範】処分行為は不要。被害者の反抗を抑圧した上で、債権者の権利行使が困難となり債務免脱の確実かつ具体的な状態が生じれば足りる。"
                  rows={3}
                  className="w-full p-2 text-xs border border-amber-300 rounded-lg bg-amber-50/50"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">詳細解答・当てはめ (answer)</label>
                <textarea
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  placeholder="例: 乙は暴行脅迫によりVの反抗を抑圧して債権放棄書面を作成・交付させており、債務免脱の具体的状態が作出されたといえるため、処分行為の有無にかかわらず同罪が成立する。"
                  rows={3}
                  required
                  className="w-full p-2 text-xs border rounded-lg bg-slate-50"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">参照判例・条文 (reference)</label>
                <input
                  type="text"
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  placeholder="例: 最判昭32.9.13、刑法236条2項"
                  className="w-full p-2 text-xs border rounded-lg bg-slate-50"
                />
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white text-xs font-bold rounded-lg shadow-sm"
                >
                  {isSubmitting ? '処理中...' : editingCard ? '変更を保存する' : 'カードを追加する'}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
