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

  // UI用ステート
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

  // === 指定IDの問題を取得 ===
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

  // === 1問ランダムに取得する処理 ===
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

  // === Supabaseから最新状態を復元 ===
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

  // テンキーのボタン数を問題文から判定するロジック
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
    <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc', color: '#0f172a', padding: '32px 16px', fontFamily: 'sans-serif' }}>
      <div style={{ maxWidth: '768px', margin: '0 auto' }}>
        
        {/* ヘッダー＆文字サイズコントロール（元のレイアウト構成を復元） */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '2px solid #e2e8f0', paddingBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#1e293b', margin: 0 }}>📝 短答過去問 ドリルモード</h1>
            <button
              type="button"
              onClick={() => pullSyncStateFromCloud(true)}
              title="クリックでPC・スマホ間の最新状態を即時同期"
              style={{
                padding: '4px 10px',
                borderRadius: '9999px',
                fontSize: '12px',
                fontWeight: 'bold',
                cursor: 'pointer',
                border: syncStatus === 'synced' ? '1px solid #6ee7b7' : syncStatus === 'syncing' ? '1px solid #fcd34d' : '1px solid #fca5a5',
                backgroundColor: syncStatus === 'synced' ? '#ecfdf5' : syncStatus === 'syncing' ? '#fffbeb' : '#fef2f2',
                color: syncStatus === 'synced' ? '#047857' : syncStatus === 'syncing' ? '#b45309' : '#b91c1c',
              }}
            >
              {syncStatus === 'synced' ? `☁️ 同期済 ${lastSyncedAt}` : syncStatus === 'syncing' ? '⏳ 同期中...' : '⚠️ 同期エラー'}
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: '#ffffff', padding: '6px 12px', borderRadius: '8px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0' }}>
              <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#475569' }}>文字サイズ:</span>
              {[100, 125, 150].map((scale) => (
                <button
                  key={scale}
                  onClick={() => handleScaleChange(scale)}
                  style={{
                    padding: '4px 8px',
                    fontSize: '12px',
                    fontWeight: 'bold',
                    borderRadius: '4px',
                    border: 'none',
                    cursor: 'pointer',
                    backgroundColor: fontSizeScale === scale ? '#2563eb' : '#f1f5f9',
                    color: fontSizeScale === scale ? '#ffffff' : '#334155',
                  }}
                >
                  {scale === 100 ? '標準' : `${scale}%`}
                </button>
              ))}
            </div>

            <Link
              href="/"
              style={{
                padding: '7px 12px',
                backgroundColor: '#1e293b',
                color: '#ffffff',
                fontSize: '12px',
                fontWeight: 'bold',
                borderRadius: '8px',
                textDecoration: 'none',
              }}
            >
              ← トップへ
            </Link>
          </div>
        </div>

        {/* フィルター＆同期スコアバー（コンパクト1行配置） */}
        <div style={{ backgroundColor: '#ffffff', padding: '12px 16px', borderRadius: '12px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0', marginBottom: '20px', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <select
              value={selectedSubject}
              onChange={(e) => handleSubjectChange(e.target.value)}
              style={{ padding: '6px 10px', borderRadius: '8px', border: '1px solid #2563eb', fontSize: '13px', fontWeight: 'bold', color: '#1e293b', backgroundColor: '#ffffff', cursor: 'pointer' }}
            >
              <option value="ALL">📚 すべての科目</option>
              {subjects.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>

            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer', padding: '4px 10px', borderRadius: '8px', backgroundColor: onlyMistake ? '#fef3c7' : 'transparent', color: '#dc2626', border: onlyMistake ? '1px solid #fcd34d' : '1px solid transparent' }}>
              <input
                type="checkbox"
                checked={onlyMistake}
                onChange={(e) => handleOnlyMistakeChange(e.target.checked)}
              />
              ❌ 間違えた問題のみ ({mistakeIds.length})
            </label>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', fontWeight: 'bold', color: '#334155' }}>
            <span>
              📊 成績: <span style={{ color: '#059669', fontSize: '16px' }}>{correctAttempts}</span> / {totalAttempts}
              {totalAttempts > 0 && ` (${Math.round((correctAttempts / totalAttempts) * 100)}%)`}
            </span>
            {(totalAttempts > 0 || mistakeIds.length > 0) && (
              <button
                onClick={handleResetProgress}
                style={{ padding: '4px 8px', fontSize: '11px', backgroundColor: '#f1f5f9', color: '#475569', borderRadius: '6px', border: '1px solid #cbd5e1', cursor: 'pointer', fontWeight: 'bold' }}
              >
                リセット
              </button>
            )}
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '80px 0', color: '#64748b', fontWeight: 'bold' }}>問題を読み込んでいます...</div>
        ) : !question ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
            <p style={{ fontSize: '16px', fontWeight: 'bold', color: '#334155', marginBottom: '16px' }}>
              {onlyMistake ? '現在、間違えた問題（復習対象）はありません！🎉' : '条件に一致する問題が見つかりませんでした。'}
            </p>
            <button
              onClick={() => fetchRandomQuestion()}
              style={{ padding: '10px 20px', backgroundColor: '#2563eb', color: '#ffffff', fontWeight: 'bold', borderRadius: '8px', border: 'none', cursor: 'pointer' }}
            >
              別の問題を読み込む
            </button>
          </div>
        ) : (
          <>
            {/* 問題表示エリア（元のデザインを完全復元） */}
            <div style={{ backgroundColor: '#ffffff', padding: '24px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', borderLeft: isMarkedMistake ? '4px solid #ef4444' : '4px solid #2563eb', marginBottom: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                  <span style={{ backgroundColor: '#dbeafe', color: '#1e40af', fontSize: '14px', fontWeight: 'bold', padding: '4px 12px', borderRadius: '6px' }}>
                    {question.subject}
                  </span>
                  <h2 style={{ fontWeight: 'bold', fontSize: '18px', color: '#1e293b', margin: 0 }}>
                    {question.year ? `(${question.year}) ` : ''}第{question.question_num}問
                  </h2>
                  <span style={{ fontSize: '12px', color: '#94a3b8', backgroundColor: '#f1f5f9', padding: '4px 8px', borderRadius: '6px' }}>
                    ID: {question.id}
                  </span>
                </div>

                <button
                  onClick={() => toggleMistake(question.id)}
                  style={{
                    padding: '4px 10px',
                    fontSize: '12px',
                    fontWeight: 'bold',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    backgroundColor: isMarkedMistake ? '#fef3c7' : '#f8fafc',
                    color: isMarkedMistake ? '#b91c1c' : '#475569',
                    border: isMarkedMistake ? '1px solid #f87171' : '1px solid #cbd5e1',
                  }}
                >
                  {isMarkedMistake ? '🔖 復習中' : '☆ 復習に追加'}
                </button>
              </div>
              <div className={getFontSizeClass()} style={{ whiteSpace: 'pre-wrap', lineHeight: '1.75', color: '#1e293b' }}>
                {question.question_text}
              </div>
            </div>

            {/* 解答 or 結果エリア（元のテンキーデザインを完全復元） */}
            {!isAnswered ? (
              <div style={{ backgroundColor: '#ffffff', padding: '24px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', border: '1px solid #e2e8f0' }}>
                <input
                  type="text"
                  readOnly
                  value={userAnswer}
                  placeholder="解答"
                  style={{ width: '100%', maxWidth: '320px', margin: '0 auto 24px auto', display: 'block', textAlign: 'center', fontSize: '30px', fontWeight: 'bold', letterSpacing: '0.15em', padding: '14px', border: '2px solid #2563eb', borderRadius: '10px', backgroundColor: '#f8fafc', color: '#0f172a', boxSizing: 'border-box' }}
                />
                
                {/* テンキー（ボタン数は動的） */}
                <div style={{ display: 'grid', gridTemplateColumns: isTwoBtns ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)', gap: '12px', marginBottom: '24px', maxWidth: '448px', margin: '0 auto 24px auto' }}>
                  {Array.from({ length: maxButtons }, (_, i) => i + 1).map((n) => (
                    <button
                      key={n}
                      onClick={() => addNum(n)}
                      style={{ backgroundColor: '#ffffff', border: '2px solid #2563eb', color: '#1d4ed8', fontWeight: 'bold', fontSize: '24px', padding: '16px', borderRadius: '12px', cursor: 'pointer', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}
                    >
                      {n}
                    </button>
                  ))}
                </div>

                <div style={{ display: 'flex', gap: '16px', maxWidth: '448px', margin: '0 auto' }}>
                  <button onClick={clearNum} style={{ flex: 1, backgroundColor: '#94a3b8', color: '#ffffff', fontWeight: 'bold', padding: '16px', borderRadius: '12px', border: 'none', fontSize: '16px', cursor: 'pointer' }}>
                    クリア
                  </button>
                  <button onClick={submitAnswer} style={{ flex: 2, backgroundColor: '#dc2626', color: '#ffffff', fontWeight: 'bold', padding: '16px', borderRadius: '12px', border: 'none', fontSize: '16px', cursor: 'pointer', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                    解答を送信
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ backgroundColor: '#ffffff', padding: '32px 24px', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.08)', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                {isCorrect ? (
                  <div>
                    <p style={{ fontSize: '36px', fontWeight: 'bold', color: '#16a34a', margin: '0 0 8px 0' }}>⭕️ 大正解！！</p>
                    {isMarkedMistake && (
                      <button
                        onClick={() => toggleMistake(question.id)}
                        style={{ marginTop: '8px', padding: '6px 14px', backgroundColor: '#eff6ff', color: '#1d4ed8', border: '1px solid #93c5fd', borderRadius: '8px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}
                      >
                        🎉 克服できたので復習リストから外す
                      </button>
                    )}
                  </div>
                ) : (
                  <div>
                    <p style={{ fontSize: '36px', fontWeight: 'bold', color: '#dc2626', margin: '0 0 8px 0' }}>❌ 不正解...</p>
                    <p style={{ fontSize: '12px', fontWeight: 'bold', color: '#dc2626', margin: '0 0 12px 0' }}>🔖 復習リストに自動登録しました（クラウド同期済）</p>
                    <p style={{ fontSize: '18px', color: '#334155', margin: 0 }}>
                      あなたの解答: <span style={{ fontWeight: 'bold', letterSpacing: '0.1em' }}>{userAnswer}</span><br />
                      正解は <span style={{ fontWeight: 'bold', letterSpacing: '0.1em', fontSize: '20px', color: '#dc2626' }}>{question.answer.replace(/[^0-9]/g, '')}</span> です
                    </p>
                  </div>
                )}

                {/* AIへの連携ボタン */}
                <div style={{ marginTop: '28px', paddingTop: '24px', borderTop: '1px solid #e2e8f0' }}>
                  <button 
                    onClick={handleSendToAI}
                    style={{ width: '100%', maxWidth: '448px', margin: '0 auto', background: 'linear-gradient(to right, #4f46e5, #9333ea)', color: '#ffffff', fontWeight: 'bold', padding: '16px 24px', borderRadius: '12px', border: 'none', fontSize: '16px', cursor: 'pointer', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}
                  >
                    ✨ この問題をAIで「論証カード」にする
                  </button>
                  <p style={{ fontSize: '12px', color: '#64748b', marginTop: '8px' }}>クリックすると最適なプロンプトがコピーされます</p>
                </div>

                <button onClick={() => fetchRandomQuestion()} style={{ marginTop: '20px', width: '100%', maxWidth: '448px', margin: '20px auto 0 auto', display: 'block', backgroundColor: '#22c55e', color: '#ffffff', fontWeight: 'bold', padding: '16px', borderRadius: '12px', border: 'none', fontSize: '18px', cursor: 'pointer', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                  次の問題へ
                </button>
              </div>
            )}

            {/* 解説アコーディオン（解答後のみ表示） */}
            {isAnswered && (
              <div style={{ marginTop: '24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {['a', 'b', 'c', 'd', 'e'].map((char, idx) => {
                  const explanation = question[`explanation_${char}`];
                  if (!explanation) return null;
                  const labels = ['ア', 'イ', 'ウ', 'エ', 'オ'];
                  
                  return (
                    <details key={char} style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                      <summary style={{ padding: '16px', backgroundColor: '#eff6ff', fontWeight: 'bold', color: '#1e293b', cursor: 'pointer', borderRadius: '8px' }}>
                        {labels[idx]} の解説を見る
                      </summary>
                      <div style={{ padding: '20px', whiteSpace: 'pre-wrap', color: '#334155', borderTop: '1px solid #e2e8f0', lineHeight: '1.7', fontSize: '14px' }}>
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
