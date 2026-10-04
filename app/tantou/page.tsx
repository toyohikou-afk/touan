'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

// Supabase接続設定
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export default function TantouDrillPage() {
  const [question, setQuestion] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // 解答用ステート
  const [userAnswer, setUserAnswer] = useState('');
  const [isAnswered, setIsAnswered] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  
  // UI用ステート
  const [fontSizeScale, setFontSizeScale] = useState<number>(100);

  // === 1問ランダムに取得する処理 ===
  const fetchRandomQuestion = async () => {
    setLoading(true);
    setIsAnswered(false);
    setUserAnswer('');
    
    // Supabaseから全件数を取得し、ランダムな1件を抽出（ORDER BY RANDOM()の代替）
    const { count } = await supabase
      .from('tantou_questions')
      .select('*', { count: 'exact', head: true })
      .neq('answer', ''); // 答えが空でないもの

    if (count) {
      const randomOffset = Math.floor(Math.random() * count);
      const { data } = await supabase
        .from('tantou_questions')
        .select('*')
        .range(randomOffset, randomOffset)
        .limit(1);

      if (data && data.length > 0) {
        setQuestion(data[0]);
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchRandomQuestion();
  }, []);

  // === テンキーのロジック ===
  const addNum = (n: number) => setUserAnswer(prev => prev + String(n));
  const clearNum = () => setUserAnswer('');

  const submitAnswer = () => {
    if (!userAnswer) return;
    // 正解から数字以外を除去して比較
    const correctAns = question.answer.replace(/[^0-9]/g, '');
    setIsCorrect(userAnswer === correctAns);
    setIsAnswered(true);
    
    // ※ここに将来的にSupabaseの quiz_history や tanto_progress を更新する処理を追加できます
  };

  // === 新機能：AIジェネレーターへの連携 ===
  const handleSendToAI = () => {
    const prompt = `以下の短答過去問について、関連する論点を抽出し、論証カード（規範定立と当てはめ基準）を作成してください。\n\n【科目】${question.subject}\n【問題】\n${question.question_text}`;
    
    // クリップボードにコピー
    navigator.clipboard.writeText(prompt);
    alert('✅ AI用プロンプトをクリップボードにコピーしました！\n論証カード作成画面に戻って貼り付けてください。');
  };

  // 文字サイズ調整
  const getFontSizeClass = () => {
    if (fontSizeScale === 125) return 'text-lg';
    if (fontSizeScale === 150) return 'text-xl';
    if (fontSizeScale === 175) return 'text-2xl';
    return 'text-base';
  };

  // テンキーのボタン数を問題文から判定するロジック（PHPの完全移植）
  let maxButtons = 8;
  let isTwoBtns = false;
  if (question) {
    const qText = question.question_text || '';
    if (qText.includes('1を、誤っている場合には2') || qText.includes('場合には1')) {
      maxButtons = 2;
      isTwoBtns = true;
    } else if (qText.includes('1から6')) {
      maxButtons = 6;
    } else if (qText.includes('1から5')) {
      maxButtons = 5;
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 py-10 font-sans">
      <div className="max-w-3xl mx-auto px-4">
        
        {/* ヘッダー＆文字サイズコントロール */}
        <div className="flex justify-between items-center mb-6 border-b-2 border-slate-200 pb-4">
          <h1 className="text-2xl font-bold text-slate-800">📝 短答過去問 ドリルモード</h1>
          <div className="flex items-center space-x-2 bg-white px-3 py-2 rounded-lg shadow-sm border border-slate-200">
            <span className="text-xs font-bold text-slate-600">文字サイズ:</span>
            {[100, 125, 150].map((scale) => (
              <button
                key={scale}
                onClick={() => setFontSizeScale(scale)}
                className={`px-2 py-1 text-xs font-bold rounded ${
                  fontSizeScale === scale ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {scale === 100 ? '標準' : `${scale}%`}
              </button>
            ))}
          </div>
        </div>

        {loading || !question ? (
          <div className="text-center py-20 text-slate-500 font-bold">問題を読み込んでいます...</div>
        ) : (
          <>
            {/* 問題表示エリア */}
            <div className="bg-white p-6 rounded-xl shadow-sm border-l-4 border-blue-600 mb-6">
              <div className="flex items-center space-x-3 mb-4">
                <span className="bg-blue-100 text-blue-800 text-sm font-bold px-3 py-1 rounded">
                  {question.subject}
                </span>
                <h2 className="font-bold text-lg text-slate-800">第{question.question_num}問</h2>
                <span className="text-xs text-slate-400 bg-slate-100 px-2 py-1 rounded">
                  ID: {question.id}
                </span>
              </div>
              <div className={`whitespace-pre-wrap leading-relaxed text-slate-800 ${getFontSizeClass()}`}>
                {question.question_text}
              </div>
            </div>

            {/* 解答 or 結果エリア */}
            {!isAnswered ? (
              <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <input
                  type="text"
                  readOnly
                  value={userAnswer}
                  placeholder="解答"
                  className="w-full max-w-xs mx-auto block text-center text-3xl font-bold tracking-widest p-4 border-2 border-blue-600 rounded-lg mb-6 bg-slate-50"
                />
                
                {/* テンキー（ボタン数は動的） */}
                <div className={`grid gap-3 mb-6 max-w-md mx-auto ${isTwoBtns ? 'grid-cols-2' : 'grid-cols-4'}`}>
                  {Array.from({ length: maxButtons }, (_, i) => i + 1).map((n) => (
                    <button
                      key={n}
                      onClick={() => addNum(n)}
                      className="bg-white border-2 border-blue-600 text-blue-700 font-bold text-2xl p-4 rounded-xl hover:bg-blue-600 hover:text-white transition-colors shadow-sm active:translate-y-1"
                    >
                      {n}
                    </button>
                  ))}
                </div>

                <div className="flex gap-4 max-w-md mx-auto">
                  <button onClick={clearNum} className="flex-1 bg-slate-400 text-white font-bold p-4 rounded-xl hover:bg-slate-500">
                    クリア
                  </button>
                  <button onClick={submitAnswer} className="flex-[2] bg-red-600 text-white font-bold p-4 rounded-xl hover:bg-red-700 shadow-md">
                    解答を送信
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-white p-8 rounded-xl shadow-md border border-slate-200 text-center animate-fade-in">
                {isCorrect ? (
                  <div>
                    <p className="text-4xl font-bold text-green-600 mb-2">⭕️ 大正解！！</p>
                  </div>
                ) : (
                  <div>
                    <p className="text-4xl font-bold text-red-600 mb-4">❌ 不正解...</p>
                    <p className="text-lg text-slate-700">
                      あなたの解答: <span className="font-bold tracking-widest">{userAnswer}</span><br />
                      正解は <span className="font-bold tracking-widest text-xl text-red-600">{question.answer.replace(/[^0-9]/g, '')}</span> です
                    </p>
                  </div>
                )}

                {/* 新機能：AIへの連携ボタン */}
                <div className="mt-8 pt-6 border-t border-slate-200">
                  <button 
                    onClick={handleSendToAI}
                    className="w-full max-w-md mx-auto bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold py-4 px-6 rounded-xl hover:opacity-90 transition-opacity shadow-md flex items-center justify-center gap-2"
                  >
                    ✨ この問題をAIで「論証カード」にする
                  </button>
                  <p className="text-xs text-slate-500 mt-2">クリックすると最適なプロンプトがコピーされます</p>
                </div>

                <button onClick={fetchRandomQuestion} className="mt-6 w-full max-w-md mx-auto bg-green-500 text-white font-bold py-4 rounded-xl hover:bg-green-600 shadow-md">
                  次の問題へ
                </button>
              </div>
            )}

            {/* 解説アコーディオン（解答後のみ表示） */}
            {isAnswered && (
              <div className="mt-6 space-y-3">
                {['a', 'b', 'c', 'd', 'e'].map((char, idx) => {
                  const explanation = question[`explanation_${char}`];
                  if (!explanation) return null;
                  const labels = ['ア', 'イ', 'ウ', 'エ', 'オ'];
                  
                  return (
                    <details key={char} className="bg-white border border-slate-200 rounded-lg shadow-sm">
                      <summary className="p-4 bg-blue-50 font-bold text-slate-800 cursor-pointer rounded-t-lg hover:bg-blue-100">
                        {labels[idx]} の解説を見る
                      </summary>
                      <div className="p-5 whitespace-pre-wrap text-slate-700 border-t border-slate-200 leading-relaxed text-sm">
                        {explanation}
                      </div>
                    </details>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}