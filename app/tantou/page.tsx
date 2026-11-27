'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

const SYNC_ROW_ID = 'tanto_30_user';

export default function TantouDrillPage() {
  const [question, setQuestion] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // 解答用ステート
  const [userAnswer, setUserAnswer] = useState('');
  const [isAnswered, setIsAnswered] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);

  // クラウド同期される学習進捗・成績ステート
  const [selectedSubject, setSelectedSubject] = useState<string>('ALL');
  const [subjects, setSubjects] = useState<string[]>([]);
  const [mistakeIds, setMistakeIds] = useState<number[]>([]);
  const [onlyMistake, setOnlyMistake] = useState<boolean>(false);
  const [totalAttempts, setTotalAttempts] = useState<number>(0);
  const [correctAttempts, setCorrectAttempts] = useState<number>(0);

  // UI・同期ステータス用ステート
  const [fontSizeScale, setFontSizeScale] = useState<number>(100);
  const [syncStatus, setSyncStatus] = useState<'synced' | 'syncing' | 'error'>('synced');
  const [lastSyncedAt, setLastSyncedAt] = useState<string>('');
  const currentQuestionIdRef = useRef<number | null>(null);

  // === Supabaseへ学習状態を保存 ===
  const saveSyncStateToCloud = useCallback(async (overrides?: {
    selectedSubject?: string;
    onlyMistake?: boolean;
    currentQuestionId?: number | null;
    mistakeIds?: number[];
    totalAttempts?: number;
    correctAttempts?: number;
    fontSizeScale?: number;
  }) => {
    setSyncStatus('syncing');
    try {
      const scaleVal = overrides?.fontSizeScale ?? fontSizeScale;
      const textScaleStr = scaleVal === 150 ? 'large' : scaleVal === 125 ? 'medium' : 'normal';

      const payload = {
        id: SYNC_ROW_ID,
        selected_subject: overrides?.selectedSubject ?? selectedSubject,
        only_mistake: overrides?.onlyMistake ?? onlyMistake,
        current_question_id: overrides?.currentQuestionId !== undefined
          ? overrides.currentQuestionId
          : (currentQuestionIdRef.current ?? question?.id ?? null),
        mistake_ids: overrides?.mistakeIds ?? mistakeIds,
        total_attempts: overrides?.totalAttempts ?? totalAttempts,
        correct_attempts: overrides?.correctAttempts ?? correctAttempts,
        text_scale: textScaleStr,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('tantou_sync_state')
        .upsert(payload, { onConflict: 'id' });

      if (error) throw error;
      setSyncStatus('synced');
      setLastSyncedAt(new Date().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' }));
    } catch (e) {
      console.error('クラウド同期保存エラー:', e);
      setSyncStatus('error');
    }
  }, [selectedSubject, onlyMistake, question, mistakeIds, totalAttempts, correctAttempts, fontSizeScale]);

  // === 指定IDの問題を取得する処理 ===
  const fetchQuestionById = useCallback(async (id: number) => {
    setLoading(true);
    setIsAnswered(false);
    setUserAnswer('');
    const { data, error } = await supabase
      .from('tantou_questions')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (!error && data) {
      setQuestion(data);
      currentQuestionIdRef.current = data.id;
      setLoading(false);
      return true;
    }
    setLoading(false);
    return false;
  }, []);

  // === 条件に合う問題をランダムに1問取得する処理 ===
  const fetchRandomQuestion = useCallback(async (overrideSubject?: string, overrideOnlyMistake?: boolean, overrideMistakeIds?: number[]) => {
    setLoading(true);
    setIsAnswered(false);
    setUserAnswer('');

    const subj = overrideSubject !== undefined ? overrideSubject : selectedSubject;
    const mistakeMode = overrideOnlyMistake !== undefined ? overrideOnlyMistake : onlyMistake;
    const mIds = overrideMistakeIds !== undefined ? overrideMistakeIds : mistakeIds;

    try {
      if (mistakeMode) {
        if (mIds.length === 0) {
          setQuestion(null);
          setLoading(false);
          return;
        }
        let query = supabase
          .from('tantou_questions')
          .select('*')
          .in('id', mIds)
          .neq('answer', '');

        if (subj !== 'ALL') {
          query = query.eq('subject', subj);
        }

        const { data } = await query;
        if (data && data.length > 0) {
          const picked = data[Math.floor(Math.random() * data.length)];
          setQuestion(picked);
          currentQuestionIdRef.current = picked.id;
          saveSyncStateToCloud({ currentQuestionId: picked.id });
        } else {
          setQuestion(null);
        }
        setLoading(false);
        return;
      }

      // 通常モード：件数を取得してランダム抽出
      let countQuery = supabase
        .from('tantou_questions')
        .select('*', { count: 'exact', head: true })
        .neq('answer', '');

      if (subj !== 'ALL') {
        countQuery = countQuery.eq('subject', subj);
      }

      const { count } = await countQuery;

      if (count && count > 0) {
        const randomOffset = Math.floor(Math.random() * count);
        let dataQuery = supabase
          .from('tantou_questions')
          .select('*')
          .neq('answer', '')
          .order('id', { ascending: true })
          .range(randomOffset, randomOffset)
          .limit(1);

        if (subj !== 'ALL') {
          dataQuery = dataQuery.eq('subject', subj);
        }

        const { data } = await dataQuery;
        if (data && data.length > 0) {
          setQuestion(data[0]);
          currentQuestionIdRef.current = data[0].id;
          saveSyncStateToCloud({ currentQuestionId: data[0].id });
        } else {
          setQuestion(null);
        }
      } else {
        setQuestion(null);
      }
    } catch (e) {
      console.error('問題取得エラー:', e);
      setQuestion(null);
    } finally {
      setLoading(false);
    }
  }, [selectedSubject, onlyMistake, mistakeIds, saveSyncStateToCloud]);

  // === Supabaseから最新状態を復元する処理 ===
  const pullSyncStateFromCloud = useCallback(async (showAlert = false) => {
    setSyncStatus('syncing');
    try {
      const { data, error } = await supabase
        .from('tantou_sync_state')
        .select('*')
        .eq('id', SYNC_ROW_ID)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        if (data.text_scale) {
          const scaleNum = data.text_scale === 'large' ? 150 : data.text_scale === 'medium' ? 125 : 100;
          setFontSizeScale(scaleNum);
        }
        const restoredMistakes = Array.isArray(data.mistake_ids) ? data.mistake_ids : [];
        setMistakeIds(restoredMistakes);

        if (typeof data.total_attempts === 'number') setTotalAttempts(data.total_attempts);
        if (typeof data.correct_attempts === 'number') setCorrectAttempts(data.correct_attempts);

        const nextSubj = data.selected_subject || 'ALL';
        const nextMistakeMode = Boolean(data.only_mistake);
        setSelectedSubject(nextSubj);
        setOnlyMistake(nextMistakeMode);

        // クラウド上に保存された問題IDがあり、現在の問題と異なる場合はその問題を表示
        if (data.current_question_id && data.current_question_id !== currentQuestionIdRef.current) {
          const restored = await fetchQuestionById(data.current_question_id);
          if (!restored) {
            await fetchRandomQuestion(nextSubj, nextMistakeMode, restoredMistakes);
          }
        } else if (!currentQuestionIdRef.current) {
          await fetchRandomQuestion(nextSubj, nextMistakeMode, restoredMistakes);
        }

        setSyncStatus('synced');
        setLastSyncedAt(new Date().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' }));
        if (showAlert) {
          alert('☁️ クラウド（他端末）の最新状態と同期しました！');
        }
      } else {
        await fetchRandomQuestion();
        setSyncStatus('synced');
      }
    } catch (e) {
      console.error('クラウド同期読み込みエラー:', e);
      setSyncStatus('error');
      if (!currentQuestionIdRef.current) {
        await fetchRandomQuestion();
      }
    }
  }, [fetchQuestionById, fetchRandomQuestion]);

  // 科目一覧の取得と初回同期
  useEffect(() => {
    const loadSubjects = async () => {
      const { data } = await supabase
        .from('tantou_questions')
        .select('subject')
        .neq('answer', '');
      if (data) {
        const unique = Array.from(new Set(data.map((d) => d.subject).filter(Boolean))).sort();
        setSubjects(unique);
      }
    };
    loadSubjects();
    pullSyncStateFromCloud(false);
  }, []);

  // スマホ・別タブへの切り替え復帰時に自動同期
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        pullSyncStateFromCloud(false);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [pullSyncStateFromCloud]);

  // === テンキーのロジック ===
  const addNum = (n: number) => setUserAnswer((prev) => prev + String(n));
  const clearNum = () => setUserAnswer('');

  const submitAnswer = () => {
    if (!userAnswer || !question) return;
    const correctAns = question.answer.replace(/[^0-9]/g, '');
    const correct = userAnswer === correctAns;
    setIsCorrect(correct);
    setIsAnswered(true);

    const nextTotal = totalAttempts + 1;
    const nextCorrect = correct ? correctAttempts + 1 : correctAttempts;
    setTotalAttempts(nextTotal);
    if (correct) setCorrectAttempts(nextCorrect);

    let updatedMistakes = mistakeIds;
    if (!correct && !mistakeIds.includes(question.id)) {
      updatedMistakes = [...mistakeIds, question.id];
      setMistakeIds(updatedMistakes);
    }

    saveSyncStateToCloud({
      currentQuestionId: question.id,
      mistakeIds: updatedMistakes,
      totalAttempts: nextTotal,
      correctAttempts: nextCorrect,
    });
  };

  const toggleMistake = (id: number) => {
    setMistakeIds((prev) => {
      const exists = prev.includes(id);
      const updated = exists ? prev.filter((item) => item !== id) : [...prev, id];
      saveSyncStateToCloud({ mistakeIds: updated });
      return updated;
    });
  };

  const handleScaleChange = (scale: number) => {
    setFontSizeScale(scale);
    const mapped = scale === 150 ? 'xl' : scale === 125 ? 'lg' : 'base';
    const yobiMapped = scale === 150 ? 'large' : scale === 125 ? 'medium' : 'normal';
    localStorage.setItem('touan_font_size', mapped);
    localStorage.setItem('yobi_text_scale', yobiMapped);
    saveSyncStateToCloud({ fontSizeScale: scale });
  };

  const handleSubjectChange = (newSubj: string) => {
    setSelectedSubject(newSubj);
    saveSyncStateToCloud({ selectedSubject: newSubj });
    fetchRandomQuestion(newSubj, onlyMistake, mistakeIds);
  };

  const handleOnlyMistakeChange = (checked: boolean) => {
    setOnlyMistake(checked);
    saveSyncStateToCloud({ onlyMistake: checked });
    fetchRandomQuestion(selectedSubject, checked, mistakeIds);
  };

  const handleResetProgress = () => {
    if (!confirm('ドリルモードの累計成績と間違いリストをリセットしますか？')) return;
    setTotalAttempts(0);
    setCorrectAttempts(0);
    setMistakeIds([]);
    setOnlyMistake(false);
    saveSyncStateToCloud({
      totalAttempts: 0,
      correctAttempts: 0,
      mistakeIds: [],
      onlyMistake: false,
    });
  };

  // === AIジェネレーターへの連携 ===
  const handleSendToAI = () => {
    if (!question) return;
    const prompt = `以下の短答過去問について、関連する論点を抽出し、論証カード（規範定立と当てはめ基準）を作成してください。\n\n【科目】${question.subject}\n【問題】\n${question.question_text}`;
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

  const isMarkedMistake = question ? mistakeIds.includes(question.id) : false;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 py-8 font-sans">
      <div className="max-w-3xl mx-auto px-4">
        
        {/* ヘッダー＆ナビゲーション */}
        <div className="flex flex-wrap justify-between items-center gap-3 mb-5 border-b-2 border-slate-200 pb-4">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-800">📝 短答ドリル演習（同期対応）</h1>
            <button
              type="button"
              onClick={() => pullSyncStateFromCloud(true)}
              title="クリックでPC・スマホ間の最新状態を即時同期"
              className={`px-2.5 py-1 rounded-full text-xs font-bold border cursor-pointer ${
                syncStatus === 'synced'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                  : syncStatus === 'syncing'
                  ? 'bg-amber-50 text-amber-700 border-amber-300'
                  : 'bg-red-50 text-red-700 border-red-300'
              }`}
            >
              {syncStatus === 'synced' ? `☁️ 同期済 ${lastSyncedAt}` : syncStatus === 'syncing' ? '⏳ 同期中...' : '⚠️ 同期エラー'}
            </button>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center space-x-1 bg-white px-2.5 py-1.5 rounded-lg shadow-sm border border-slate-200">
              <span className="text-xs font-bold text-slate-600">文字:</span>
              {[100, 125, 150].map((scale) => (
                <button
                  key={scale}
                  onClick={() => handleScaleChange(scale)}
                  className={`px-2 py-0.5 text-xs font-bold rounded ${
                    fontSizeScale === scale ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {scale === 100 ? '標準' : `${scale}%`}
                </button>
              ))}
            </div>

            <Link
              href="/"
              className="px-3 py-1.5 bg-slate-800 text-white text-xs font-bold rounded-lg hover:bg-slate-700 transition-colors"
            >
              ← トップへ戻る
            </Link>
          </div>
        </div>

        {/* フィルター＆同期スコアバー */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 mb-6 flex flex-wrap justify-between items-center gap-3">
          <div className="flex items-center gap-3 flex-wrap">
            <select
              value={selectedSubject}
              onChange={(e) => handleSubjectChange(e.target.value)}
              className="px-3 py-1.5 rounded-lg border border-blue-500 text-sm font-bold text-slate-800 bg-white cursor-pointer"
            >
              <option value="ALL">📚 すべての科目</option>
              {subjects.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>

            <label className={`flex items-center gap-1.5 text-sm font-bold cursor-pointer px-2.5 py-1 rounded-lg ${onlyMistake ? 'bg-amber-100 text-red-700 border border-amber-300' : 'text-red-600'}`}>
              <input
                type="checkbox"
                checked={onlyMistake}
                onChange={(e) => handleOnlyMistakeChange(e.target.checked)}
              />
              ❌ 間違えた問題のみ ({mistakeIds.length})
            </label>
          </div>

          <div className="flex items-center gap-3 text-xs sm:text-sm font-bold text-slate-700">
            <span>
              📊 成績: <span className="text-emerald-600 text-base">{correctAttempts}</span> / {totalAttempts}
              {totalAttempts > 0 && ` (${Math.round((correctAttempts / totalAttempts) * 100)}%)`}
            </span>
            {(totalAttempts > 0 || mistakeIds.length > 0) && (
              <button
                onClick={handleResetProgress}
                className="px-2 py-1 text-xs bg-slate-100 hover:bg-slate-200 text-slate-600 rounded border border-slate-300"
              >
                リセット
              </button>
            )}
          </div>
        </div>

        {loading ? (
          <div className="text-center py-20 text-slate-500 font-bold">問題を読み込んでいます...</div>
        ) : !question ? (
          <div className="text-center py-16 bg-white rounded-xl border border-slate-200 shadow-sm">
            <p className="text-lg font-bold text-slate-700 mb-4">
              {onlyMistake ? '現在、間違えた問題（復習対象）はありません！🎉' : '条件に一致する問題が見つかりませんでした。'}
            </p>
            <button
              onClick={() => fetchRandomQuestion()}
              className="px-5 py-2.5 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700"
            >
              別の問題を読み込む
            </button>
          </div>
        ) : (
          <>
            {/* 問題表示エリア */}
            <div className={`bg-white p-6 rounded-xl shadow-sm border-l-4 mb-6 ${isMarkedMistake ? 'border-red-500' : 'border-blue-600'}`}>
              <div className="flex flex-wrap justify-between items-center gap-2 mb-4">
                <div className="flex items-center space-x-3">
                  <span className="bg-blue-100 text-blue-800 text-sm font-bold px-3 py-1 rounded">
                    {question.subject}
                  </span>
                  <h2 className="font-bold text-lg text-slate-800">
                    {question.year ? `(${question.year}) ` : ''}第{question.question_num}問
                  </h2>
                  <span className="text-xs text-slate-400 bg-slate-100 px-2 py-1 rounded">
                    ID: {question.id}
                  </span>
                </div>

                <button
                  onClick={() => toggleMistake(question.id)}
                  className={`px-3 py-1 text-xs font-bold rounded border cursor-pointer ${
                    isMarkedMistake
                      ? 'bg-amber-100 text-red-700 border-red-400'
                      : 'bg-slate-50 text-slate-600 border-slate-300 hover:bg-slate-100'
                  }`}
                >
                  {isMarkedMistake ? '🔖 復習中' : '☆ 復習に追加'}
                </button>
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
                
                {/* テンキー */}
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
              <div className="bg-white p-8 rounded-xl shadow-md border border-slate-200 text-center">
                {isCorrect ? (
                  <div>
                    <p className="text-4xl font-bold text-green-600 mb-2">⭕️ 大正解！！</p>
                    {isMarkedMistake && (
                      <button
                        onClick={() => toggleMistake(question.id)}
                        className="mt-2 px-4 py-1.5 bg-blue-50 text-blue-700 border border-blue-300 rounded-lg text-xs font-bold hover:bg-blue-100"
                      >
                        🎉 克服できたので復習リストから外す
                      </button>
                    )}
                  </div>
                ) : (
                  <div>
                    <p className="text-4xl font-bold text-red-600 mb-2">❌ 不正解...</p>
                    <p className="text-xs font-bold text-red-600 mb-3">🔖 復習リストに自動登録しました（クラウド同期済）</p>
                    <p className="text-lg text-slate-700">
                      あなたの解答: <span className="font-bold tracking-widest">{userAnswer}</span><br />
                      正解は <span className="font-bold tracking-widest text-xl text-red-600">{question.answer.replace(/[^0-9]/g, '')}</span> です
                    </p>
                  </div>
                )}

                {/* AIへの連携ボタン */}
                <div className="mt-8 pt-6 border-t border-slate-200">
                  <button 
                    onClick={handleSendToAI}
                    className="w-full max-w-md mx-auto bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold py-4 px-6 rounded-xl hover:opacity-90 transition-opacity shadow-md flex items-center justify-center gap-2"
                  >
                    ✨ この問題をAIで「論証カード」にする
                  </button>
                  <p className="text-xs text-slate-500 mt-2">クリックすると最適なプロンプトがコピーされます</p>
                </div>

                <button onClick={() => fetchRandomQuestion()} className="mt-6 w-full max-w-md mx-auto bg-green-500 text-white font-bold py-4 rounded-xl hover:bg-green-600 shadow-md">
                  次の問題へ
                </button>
              </div>
            )}

            {/* 解説アコーディオン */}
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
