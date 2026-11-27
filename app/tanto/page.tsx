'use client';

import React, { useState, useEffect, Suspense, useCallback, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey, {
  global: {
    fetch: (url, options) => fetch(url, { ...options, cache: 'no-store' }),
  },
});

interface SummaryOption {
  subject: string;
  tag: string;
  label: string;
}

const ALL_SUMMARY_OPTIONS: SummaryOption[] = [
  // --- 民法総則 ---
  { subject: '民法', tag: 'DAY001_CAPACITY', label: 'Day 1: 行為能力・意思能力・詐術' },
  { subject: '民法', tag: 'DAY002_FALSE_REPR', label: 'Day 2: 虚偽表示・94条2項類推適用' },
  { subject: '民法', tag: 'DAY003_MISTAKE_FRAUD', label: 'Day 3: 錯誤・詐欺取消と第三者・登記' },
  { subject: '民法', tag: 'DAY004_AGENCY', label: 'Day 4: 代理全体系・代理権濫用・表見代理' },
  { subject: '民法', tag: 'DAY005_PRESCRIPTION', label: 'Day 5: 消滅時効・援用権者・信義則' },
  { subject: '民法', tag: 'DAY006_GENERAL_MIX', label: 'Day 6: 総則総合演習（複雑論点）' },
  { subject: '民法', tag: 'DAY007_SUMMARY_FACTS', label: 'Day 7: 民法総則総括・要件事実まとめ' },
  // --- 民法 物権・担保物権 ---
  { subject: '民法', tag: 'DAY008_PROPERTY_177', label: 'Day 8: 物権変動・177条第三者・背信的悪意者' },
  { subject: '民法', tag: 'DAY009_ACQUISITION', label: 'Day 9: 取得時効・即時取得・動産物権変動' },
  { subject: '民法', tag: 'DAY010_POSSESSION', label: 'Day 10: 占有権・占有訴権・果実収取権' },
  { subject: '民法', tag: 'DAY011_CO_OWNERSHIP', label: 'Day 11: 共有・共有物分割（令和3年改正）' },
  { subject: '民法', tag: 'DAY012_SECURITY_MORTGAGE', label: 'Day 12: 抵当権・物上代位・法定地上権' },
  { subject: '民法', tag: 'DAY013_PLEDGE_LIEN', label: 'Day 13: 留置権・先取特権・質権・譲渡担保' },
  { subject: '民法', tag: 'DAY014_PROPERTY_SUMMARY', label: 'Day 14: 物権総括・要件事実' },
  // --- 民法 債権総論 ---
  { subject: '民法', tag: 'DAY015_OBLIGATION_GENERAL', label: 'Day 15: 債権総論・履行請求・債務不履行' },
  { subject: '民法', tag: 'DAY016_ASSET_PROTECTION', label: 'Day 16: 責任財産の保全（代位権・詐害行為取消）' },
  { subject: '民法', tag: 'DAY017_MULTI_PARTY_GUARANTEE', label: 'Day 17: 多数当事者・連帯債務・保証債務' },
  { subject: '民法', tag: 'DAY018_ASSIGNMENT_ASSUMPTION', label: 'Day 18: 債権譲渡・債務引受・契約上の地位' },
  { subject: '民法', tag: 'DAY019_PERFORMANCE_SUBROGATION', label: 'Day 19: 弁済・代物弁済・弁済による代位' },
  { subject: '民法', tag: 'DAY020_SETOFF_EXTINCTION', label: 'Day 20: 相殺・更改・免除・混同' },
  // --- 民法 契約各論・法定債権 ---
  { subject: '民法', tag: 'DAY021_CONTRACT_GENERAL', label: 'Day 21: 契約総論・危険負担・解除' },
  { subject: '民法', tag: 'DAY022_CONTRACT_SALE', label: 'Day 22: 売買・贈与・契約不適合責任' },
  { subject: '民法', tag: 'DAY023_CONTRACT_LEASE', label: 'Day 23: 賃貸借・消費貸借・使用貸借' },
  { subject: '民法', tag: 'DAY024_CONTRACT_SERVICE', label: 'Day 24: 請負・委任・寄託・和解' },
  { subject: '民法', tag: 'DAY025_QUASI_CONTRACT', label: 'Day 25: 事務管理・不当利得' },
  { subject: '民法', tag: 'DAY026_TORTS', label: 'Day 26: 不法行為（使用者責任・共同不法行為）' },
  // --- 民法 親族・相続・総括 ---
  { subject: '民法', tag: 'DAY027_FAMILY_RELATIONS', label: 'Day 27: 親族（婚姻・離婚・親子・成年後見）' },
  { subject: '民法', tag: 'DAY028_SUCCESSION', label: 'Day 28: 相続（遺産分割・相続分・放棄・配偶者居住権）' },
  { subject: '民法', tag: 'DAY029_WILL_RESERVED_SHARE', label: 'Day 29: 遺言・遺留分侵害額請求' },
  { subject: '民法', tag: 'DAY030_CIVIL_CODE_MASTER', label: 'Day 30: 民法全編総括・横断演習・要件事実完成' },
  // --- 商法・会社法 ---
  { subject: '商法・会社法', tag: 'DAY031_CORP_FORMATION', label: 'Day 31: 会社法・設立・出資仮装・設立無効' },
  { subject: '商法・会社法', tag: 'DAY032_CORP_SHARES', label: 'Day 32: 株式・譲渡制限・名義書換・自己株式' },
  { subject: '商法・会社法', tag: 'DAY033_CORP_FINANCING', label: 'Day 33: 新株予約権・有利発行・差止請求' },
  { subject: '商法・会社法', tag: 'DAY034_CORP_SHAREHOLDERS_MEETING', label: 'Day 34: 機関① 株主総会権限・株主提案・決議瑕疵' },
  { subject: '商法・会社法', tag: 'DAY035_CORP_DIRECTORS_BOARD', label: 'Day 35: 機関② 取締役会・利益相反・表見代表' },
  { subject: '商法・会社法', tag: 'DAY036_CORP_OFFICER_LIABILITY', label: 'Day 36: 役員責任・429条第三者責任・株主代表訴訟' },
  { subject: '商法・会社法', tag: 'DAY037_CORP_AUDIT_COMMITTEES', label: 'Day 37: 監査役・監査等委員会・指名委員会等設置会社' },
  { subject: '商法・会社法', tag: 'DAY038_CORP_ACCOUNTING_DIVIDEND', label: 'Day 38: 計算・資本金・分配可能額・剰余金配当' },
  { subject: '商法・会社法', tag: 'DAY039_CORP_MERGER_SPLIT', label: 'Day 39: 組織再編① 合併・会社分割・事業譲渡' },
  { subject: '商法・会社法', tag: 'DAY040_CORP_REORGANIZATION_MASTER', label: 'Day 40: 組織再編② 株式交換・移転・再編無効の訴え' },
];

const SUBJECT_LIST = Array.from(new Set(ALL_SUMMARY_OPTIONS.map((item) => item.subject)));

interface TantoQuestion {
  id: string;
  subject: string;
  topic: string;
  summary_tag: string;
  question_text: string;
  correct_answer: boolean;
  point_rule: string | null;
  explanation: string;
}

type FontSize = 'normal' | 'large' | 'xlarge';

function TantoPracticeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlSummaryParam = searchParams.get('summary');

  const [syncKey, setSyncKey] = useState<string>('ufu');
  const [isEditingKey, setIsEditingKey] = useState(false);
  const [tempKey, setTempKey] = useState('ufu');

  const [activeSummaryTag, setActiveSummaryTag] = useState<string | null>(null);

  const currentSubject = useMemo(() => {
    if (!activeSummaryTag) return '民法';
    const found = ALL_SUMMARY_OPTIONS.find((item) => item.tag === activeSummaryTag);
    return found ? found.subject : '民法';
  }, [activeSummaryTag]);

  const currentSubjectOptions = useMemo(() => {
    return ALL_SUMMARY_OPTIONS.filter((item) => item.subject === currentSubject);
  }, [currentSubject]);

  const [questions, setQuestions] = useState<TantoQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<Record<number, boolean>>({});
  const [fontSize, setFontSize] = useState<FontSize>('large');
  const [streak, setStreak] = useState(0);
  const [stats, setStats] = useState({ correct: 0, total: 0 });
  const [loading, setLoading] = useState(true);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [errorDetail, setErrorDetail] = useState<string>('');

  const saveSyncProgress = useCallback(
    async (
      targetTag: string,
      newIndex: number,
      newAnswers: Record<number, boolean>,
      newCorrect: number,
      newTotal: number,
      newStreak: number
    ) => {
      setSyncStatus('saving');
      setErrorDetail('');
      try {
        const { data: existing, error: selErr } = await supabase
          .from('user_sync_progress')
          .select('id')
          .eq('sync_key', syncKey)
          .eq('summary_tag', targetTag)
          .limit(1)
          .maybeSingle();

        if (selErr) throw selErr;

        const payload = {
          sync_key: syncKey,
          summary_tag: targetTag,
          current_index: newIndex,
          user_answers: newAnswers,
          correct_count: newCorrect,
          total_count: newTotal,
          streak: newStreak,
          updated_at: new Date().toISOString(),
        };

        if (existing?.id) {
          const { error: updErr } = await supabase
            .from('user_sync_progress')
            .update(payload)
            .eq('id', existing.id);
          if (updErr) throw updErr;
        } else {
          const { error: insErr } = await supabase
            .from('user_sync_progress')
            .insert([payload]);
          if (insErr) throw insErr;
        }

        setSyncStatus('saved');
      } catch (err: unknown) {
        setSyncStatus('error');
        setErrorDetail(err instanceof Error ? err.message : '通信エラー');
      }
    },
    [syncKey]
  );

  const forceFetchLatestFromCloud = useCallback(
    async (currentKey: string, currentTag: string | null, currentQuestionsLen: number) => {
      setSyncStatus('saving');
      try {
        const { data: latestRecord, error } = await supabase
          .from('user_sync_progress')
          .select('*')
          .eq('sync_key', currentKey)
          .order('updated_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (error) {
          setSyncStatus('error');
          setErrorDetail(error.message);
          return;
        }

        if (latestRecord && latestRecord.summary_tag) {
          if (latestRecord.summary_tag !== currentTag) {
            setActiveSummaryTag(latestRecord.summary_tag);
            router.replace(`/tanto?summary=${latestRecord.summary_tag}`);
            return;
          }

          if (currentQuestionsLen > 0) {
            const restoredIndex =
              typeof latestRecord.current_index === 'number' &&
              latestRecord.current_index >= 0 &&
              latestRecord.current_index < currentQuestionsLen
                ? latestRecord.current_index
                : 0;
            setCurrentIndex(restoredIndex);
            setUserAnswers(latestRecord.user_answers || {});
            setStats({
              correct: latestRecord.correct_count || 0,
              total: latestRecord.total_count || 0,
            });
            setStreak(latestRecord.streak || 0);
          }
        } else if (!currentTag) {
          setActiveSummaryTag(urlSummaryParam || 'DAY001_CAPACITY');
        }
        setSyncStatus('saved');
      } catch (err: unknown) {
        setSyncStatus('error');
        setErrorDetail(err instanceof Error ? err.message : '同期エラー');
      }
    },
    [router, urlSummaryParam]
  );

  useEffect(() => {
    const savedKey = localStorage.getItem('yobi_tanto_synckey') || 'ufu';
    setSyncKey(savedKey);
    setTempKey(savedKey);

    if (urlSummaryParam) {
      setActiveSummaryTag(urlSummaryParam);
    } else {
      forceFetchLatestFromCloud(savedKey, null, 0);
    }
  }, [urlSummaryParam, forceFetchLatestFromCloud]);

  useEffect(() => {
    if (!activeSummaryTag) return;

    async function loadData() {
      setLoading(true);

      const { data: qData } = await supabase
        .from('tanto_questions')
        .select('*')
        .eq('summary_tag', activeSummaryTag)
        .order('created_at', { ascending: true })
        .limit(100);

      const loaded = qData || [];
      setQuestions(loaded);

      if (loaded.length > 0 && activeSummaryTag) {
        const { data: syncData } = await supabase
          .from('user_sync_progress')
          .select('*')
          .eq('sync_key', syncKey)
          .eq('summary_tag', activeSummaryTag)
          .order('updated_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (syncData) {
          const restoredIndex =
            typeof syncData.current_index === 'number' &&
            syncData.current_index >= 0 &&
            syncData.current_index < loaded.length
              ? syncData.current_index
              : 0;
          setCurrentIndex(restoredIndex);
          setUserAnswers(syncData.user_answers || {});
          setStats({ correct: syncData.correct_count || 0, total: syncData.total_count || 0 });
          setStreak(syncData.streak || 0);
        } else {
          setCurrentIndex(0);
          setUserAnswers({});
          setStats({ correct: 0, total: 0 });
          setStreak(0);
        }
      }
      setLoading(false);
      setSyncStatus('saved');
    }
    loadData();
  }, [activeSummaryTag, syncKey]);

  useEffect(() => {
    const handleWakeUp = () => {
      if (document.visibilityState === 'visible' && !urlSummaryParam) {
        forceFetchLatestFromCloud(syncKey, activeSummaryTag, questions.length);
      }
    };
    window.addEventListener('focus', handleWakeUp);
    document.addEventListener('visibilitychange', handleWakeUp);
    return () => {
      window.removeEventListener('focus', handleWakeUp);
      document.removeEventListener('visibilitychange', handleWakeUp);
    };
  }, [syncKey, activeSummaryTag, questions.length, urlSummaryParam, forceFetchLatestFromCloud]);

  const currentQ = questions[currentIndex];
  const selectedAnswer = userAnswers[currentIndex] ?? null;
  const isAnswered = selectedAnswer !== null;

  const handleSelect = (choice: boolean) => {
    if (isAnswered || !currentQ || !activeSummaryTag) return;
    const newAnswers = { ...userAnswers, [currentIndex]: choice };
    setUserAnswers(newAnswers);

    const isCorr = choice === currentQ.correct_answer;
    const newCorrect = stats.correct + (isCorr ? 1 : 0);
    const newTotal = stats.total + 1;
    const newStreak = isCorr ? streak + 1 : 0;

    setStats({ correct: newCorrect, total: newTotal });
    setStreak(newStreak);

    saveSyncProgress(activeSummaryTag, currentIndex, newAnswers, newCorrect, newTotal, newStreak);
  };

  const handlePrev = () => {
    if (currentIndex > 0 && activeSummaryTag) {
      const nextIdx = currentIndex - 1;
      setCurrentIndex(nextIdx);
      saveSyncProgress(activeSummaryTag, nextIdx, userAnswers, stats.correct, stats.total, streak);
    }
  };

  const handleNext = () => {
    if (!activeSummaryTag) return;
    if (currentIndex < questions.length - 1) {
      const nextIdx = currentIndex + 1;
      setCurrentIndex(nextIdx);
      saveSyncProgress(activeSummaryTag, nextIdx, userAnswers, stats.correct, stats.total, streak);
    } else {
      alert(`🎉 演習完了！ 正解数: ${stats.correct} / ${questions.length}`);
    }
  };

  const switchAndMarkSummary = async (nextTag: string) => {
    setActiveSummaryTag(nextTag);
    router.replace(`/tanto?summary=${nextTag}`);

    const { data: existing } = await supabase
      .from('user_sync_progress')
      .select('*')
      .eq('sync_key', syncKey)
      .eq('summary_tag', nextTag)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    await saveSyncProgress(
      nextTag,
      existing?.current_index ?? 0,
      existing?.user_answers ?? {},
      existing?.correct_count ?? 0,
      existing?.total_count ?? 0,
      existing?.streak ?? 0
    );
  };

  const handleSubjectChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const nextSub = e.target.value;
    const firstOption = ALL_SUMMARY_OPTIONS.find((item) => item.subject === nextSub);
    if (firstOption) {
      await switchAndMarkSummary(firstOption.tag);
    }
  };

  const handleSummaryChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    await switchAndMarkSummary(e.target.value);
  };

  const handleResetSession = async () => {
    if (!activeSummaryTag) return;
    if (!confirm('この単元の進捗をリセットして第1問からやり直しますか？')) return;
    setCurrentIndex(0);
    setUserAnswers({});
    setStats({ correct: 0, total: 0 });
    setStreak(0);
    await saveSyncProgress(activeSummaryTag, 0, {}, 0, 0, 0);
  };

  const fontSizes = {
    normal: { question: '16px', point: '13px', explanation: '14px' },
    large: { question: '19px', point: '14px', explanation: '15px' },
    xlarge: { question: '22px', point: '16px', explanation: '17px' },
  }[fontSize];

  if (loading || !activeSummaryTag) {
    return (
      <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', backgroundColor: '#020617', color: '#94a3b8', fontFamily: 'monospace', fontSize: '14px' }}>
        最新の学習DAYと進捗を同期中...
      </div>
    );
  }

  const accuracy = stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0;

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#020617', color: '#f1f5f9', fontFamily: 'sans-serif' }}>
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '16px', maxWidth: '540px', margin: '0 auto', boxSizing: 'border-box' }}>
        
        {/* ヘッダー */}
        <header style={{ borderBottom: '1px solid #1e293b', paddingBottom: '12px', paddingTop: '4px', userSelect: 'none' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', gap: '8px' }}>
            <Link
              href="/"
              style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 'bold', backgroundColor: '#0f172a', border: '1px solid #1e293b', padding: '6px 10px', borderRadius: '8px', textDecoration: 'none', flexShrink: 0 }}
            >
              ← 論証集
            </Link>

            <Link
              href="/practice"
              style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#a5b4fc', fontWeight: 'bold', backgroundColor: 'rgba(30, 27, 75, 0.85)', border: '1px solid rgba(67, 56, 202, 0.8)', padding: '6px 12px', borderRadius: '8px', textDecoration: 'none' }}
            >
              <span>📝 論文演習へ</span>
            </Link>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', flexShrink: 0 }}>
              {syncStatus === 'saving' && (
                <span style={{ color: '#fbbf24', fontFamily: 'monospace' }}>同期中...</span>
              )}
              {syncStatus === 'error' && (
                <span title={errorDetail} style={{ color: '#fb7185', fontFamily: 'monospace', fontWeight: 'bold' }}>
                  ⚠失敗
                </span>
              )}
              {(syncStatus === 'saved' || syncStatus === 'idle') && (
                <button
                  onClick={() => forceFetchLatestFromCloud(syncKey, activeSummaryTag, questions.length)}
                  title="タップしてクラウドの最新DAY・進捗を手動読込"
                  style={{ color: '#34d399', fontFamily: 'monospace', display: 'flex', alignItems: 'center', gap: '4px', backgroundColor: 'rgba(6, 78, 59, 0.5)', border: '1px solid #047857', padding: '4px 8px', borderRadius: '6px', cursor: 'pointer' }}
                >
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#34d399', display: 'inline-block' }}></span>
                  同期
                </button>
              )}
              <button
                onClick={() => setIsEditingKey(!isEditingKey)}
                style={{ color: '#94a3b8', textDecoration: 'underline', fontFamily: 'monospace', background: 'none', border: 'none', cursor: 'pointer', padding: '2px' }}
              >
                [{syncKey}]
              </button>
            </div>
          </div>

          {syncStatus === 'error' && errorDetail && (
            <div style={{ marginBottom: '8px', borderRadius: '6px', backgroundColor: 'rgba(76, 5, 25, 0.8)', border: '1px solid #be123c', padding: '6px 10px', fontSize: '11px', color: '#fecdd3' }}>
              同期エラー: {errorDetail}
            </div>
          )}

          {/* 科目＆日程ドロップダウン */}
          <div style={{ marginBottom: '10px', display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '8px' }}>
            <div>
              <label style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>【科目】</label>
              <select
                value={currentSubject}
                onChange={handleSubjectChange}
                style={{ width: '100%', backgroundColor: '#0f172a', border: '1px solid rgba(79, 70, 229, 0.6)', color: '#c7d2fe', fontSize: '12px', fontWeight: 'bold', padding: '8px', borderRadius: '10px', outline: 'none', boxSizing: 'border-box' }}
              >
                {SUBJECT_LIST.map((sub) => (
                  <option key={sub} value={sub} style={{ backgroundColor: '#0f172a', color: '#e2e8f0' }}>
                    {sub}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>【学習日程表 SUMMARY 選択】</label>
              <select
                value={activeSummaryTag}
                onChange={handleSummaryChange}
                style={{ width: '100%', backgroundColor: '#0f172a', border: '1px solid rgba(79, 70, 229, 0.6)', color: '#c7d2fe', fontSize: '12px', fontWeight: 'bold', padding: '8px', borderRadius: '10px', outline: 'none', boxSizing: 'border-box' }}
              >
                {currentSubjectOptions.map((opt) => (
                  <option key={opt.tag} value={opt.tag} style={{ backgroundColor: '#0f172a', color: '#e2e8f0' }}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {isEditingKey && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px', backgroundColor: '#0f172a', border: '1px solid #334155', padding: '8px', borderRadius: '8px', fontSize: '12px' }}>
              <span style={{ color: '#cbd5e1', fontWeight: 'bold' }}>同期ID:</span>
              <input
                type="text"
                value={tempKey}
                onChange={(e) => setTempKey(e.target.value)}
                style={{ backgroundColor: '#1e293b', border: '1px solid #475569', padding: '4px 8px', borderRadius: '4px', color: '#ffffff', flex: 1, fontFamily: 'monospace', fontSize: '12px' }}
              />
              <button
                onClick={() => {
                  if (tempKey.trim()) {
                    setSyncKey(tempKey.trim());
                    localStorage.setItem('yobi_tanto_synckey', tempKey.trim());
                    setIsEditingKey(false);
                  }
                }}
                style={{ backgroundColor: '#4f46e5', color: '#ffffff', fontWeight: 'bold', padding: '4px 10px', borderRadius: '4px', border: 'none', cursor: 'pointer' }}
              >
                設定
              </button>
            </div>
          )}

          {/* 前へ・問題番号・次へ */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <button
              onClick={handlePrev}
              disabled={currentIndex === 0}
              style={{
                padding: '6px 12px',
                borderRadius: '8px',
                fontSize: '12px',
                fontWeight: 'bold',
                border: currentIndex === 0 ? '1px solid #1e293b' : '1px solid #475569',
                backgroundColor: currentIndex === 0 ? 'rgba(15, 23, 42, 0.3)' : '#1e293b',
                color: currentIndex === 0 ? '#475569' : '#e2e8f0',
                cursor: currentIndex === 0 ? 'not-allowed' : 'pointer',
              }}
            >
              ◀ 前へ
            </button>
            <span style={{ fontWeight: 'bold', fontSize: '14px', color: '#e2e8f0' }}>
              問 {questions.length > 0 ? currentIndex + 1 : 0} / {questions.length}
            </span>
            <button
              onClick={handleNext}
              disabled={currentIndex === questions.length - 1}
              style={{
                padding: '6px 12px',
                borderRadius: '8px',
                fontSize: '12px',
                fontWeight: 'bold',
                border: currentIndex === questions.length - 1 ? '1px solid #1e293b' : '1px solid #4f46e5',
                backgroundColor: currentIndex === questions.length - 1 ? 'rgba(15, 23, 42, 0.3)' : 'rgba(49, 46, 129, 0.5)',
                color: currentIndex === questions.length - 1 ? '#475569' : '#c7d2fe',
                cursor: currentIndex === questions.length - 1 ? 'not-allowed' : 'pointer',
              }}
            >
              次へ ▶
            </button>
          </div>

          {/* 文字サイズ＆定着率 */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', backgroundColor: '#0f172a', border: '1px solid #1e293b', padding: '4px', borderRadius: '8px' }}>
              <span style={{ fontSize: '10px', color: '#94a3b8', padding: '0 4px', fontWeight: 'bold' }}>文字</span>
              {(['normal', 'large', 'xlarge'] as FontSize[]).map((sz) => (
                <button
                  key={sz}
                  onClick={() => setFontSize(sz)}
                  style={{
                    padding: '2px 8px',
                    borderRadius: '4px',
                    fontSize: '12px',
                    border: 'none',
                    cursor: 'pointer',
                    backgroundColor: fontSize === sz ? '#4f46e5' : 'transparent',
                    color: fontSize === sz ? '#ffffff' : '#94a3b8',
                    fontWeight: fontSize === sz ? 'bold' : 'normal',
                  }}
                >
                  {sz === 'normal' ? '標準' : sz === 'large' ? '大' : '特大'}
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontWeight: 'bold', color: accuracy >= 80 ? '#34d399' : '#fbbf24' }}>定着率: {accuracy}%</span>
              <button onClick={handleResetSession} style={{ fontSize: '11px', color: '#94a3b8', textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer' }}>最初から</button>
            </div>
          </div>
        </header>

        {/* 問題文・○✕ボタン・解説カード */}
        <main style={{ margin: 'auto 0', padding: '12px 0' }}>
          {questions.length === 0 ? (
            <div style={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '16px', padding: '24px', textAlign: 'center', color: '#cbd5e1' }}>
              <p style={{ fontWeight: 'bold', fontSize: '16px', marginBottom: '4px' }}>このSUMMARYの問題は現在準備中です</p>
              <p style={{ fontSize: '12px', color: '#64748b' }}>SQLを実行して問題データを投入してください。</p>
            </div>
          ) : (
            <>
              <div style={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '16px', padding: '20px', boxShadow: '0 10px 25px rgba(0,0,0,0.4)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginBottom: '12px' }}>
                  <span style={{ fontSize: '12px', fontWeight: 'bold', padding: '3px 8px', borderRadius: '6px', backgroundColor: '#1e1b4b', color: '#a5b4fc', border: '1px solid rgba(55, 48, 163, 0.6)' }}>
                    {currentQ.topic}
                  </span>
                  {streak >= 3 && <span style={{ fontSize: '12px', color: '#fbbf24', fontWeight: 'bold' }}>🔥 {streak} 連続正解</span>}
                </div>
                <p style={{ fontSize: fontSizes.question, lineHeight: '1.7', color: '#f1f5f9', margin: 0, whiteSpace: 'pre-wrap' }}>
                  {currentQ.question_text}
                </p>
              </div>

              <div style={{ marginTop: '16px' }}>
                {!isAnswered ? (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', userSelect: 'none' }}>
                    <button
                      onClick={() => handleSelect(true)}
                      style={{ height: '84px', backgroundColor: 'rgba(6, 78, 59, 0.45)', border: '2px solid rgba(16, 185, 129, 0.6)', borderRadius: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,0,0,0.2)' }}
                    >
                      <span style={{ fontSize: '32px', fontWeight: '900', color: '#34d399', lineHeight: '1' }}>○</span>
                      <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#6ee7b7', marginTop: '4px' }}>正しい</span>
                    </button>
                    <button
                      onClick={() => handleSelect(false)}
                      style={{ height: '84px', backgroundColor: 'rgba(136, 19, 55, 0.45)', border: '2px solid rgba(244, 63, 94, 0.6)', borderRadius: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,0,0,0.2)' }}
                    >
                      <span style={{ fontSize: '32px', fontWeight: '900', color: '#fb7185', lineHeight: '1' }}>✕</span>
                      <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#fda4af', marginTop: '4px' }}>誤り</span>
                    </button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div
                      style={{
                        padding: '16px',
                        borderRadius: '12px',
                        border: selectedAnswer === currentQ.correct_answer ? '1px solid rgba(16, 185, 129, 0.6)' : '1px solid rgba(244, 63, 94, 0.6)',
                        backgroundColor: selectedAnswer === currentQ.correct_answer ? 'rgba(6, 78, 59, 0.35)' : 'rgba(136, 19, 55, 0.35)',
                        color: selectedAnswer === currentQ.correct_answer ? '#6ee7b7' : '#fda4af',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '18px', marginBottom: '6px' }}>
                        <span>{selectedAnswer === currentQ.correct_answer ? '正解 (○)' : '不正解 (✕)'}</span>
                        <span style={{ fontSize: '12px', backgroundColor: 'rgba(15, 23, 42, 0.85)', padding: '4px 10px', borderRadius: '6px', border: '1px solid #334155', color: '#e2e8f0' }}>
                          正解肢: {currentQ.correct_answer ? '○ 正しい' : '✕ 誤り'}
                        </span>
                      </div>
                      {currentQ.point_rule && (
                        <div style={{ marginTop: '10px', padding: '12px', backgroundColor: 'rgba(15, 23, 42, 0.95)', borderRadius: '8px', border: '1px solid rgba(245, 158, 11, 0.35)', color: '#fde68a' }}>
                          <span style={{ fontWeight: 'bold', display: 'block', color: '#fbbf24', marginBottom: '4px', fontSize: '12px' }}>【判例規範・当てはめ基準】</span>
                          <p style={{ fontSize: fontSizes.point, lineHeight: '1.6', margin: 0, whiteSpace: 'pre-wrap' }}>{currentQ.point_rule}</p>
                        </div>
                      )}
                      <p style={{ marginTop: '10px', marginBottom: 0, color: '#e2e8f0', fontSize: fontSizes.explanation, lineHeight: '1.65', whiteSpace: 'pre-wrap' }}>
                        {currentQ.explanation}
                      </p>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '4px', userSelect: 'none' }}>
                      <button
                        onClick={handlePrev}
                        disabled={currentIndex === 0}
                        style={{
                          height: '48px',
                          borderRadius: '12px',
                          fontWeight: 'bold',
                          fontSize: '14px',
                          border: currentIndex === 0 ? '1px solid #1e293b' : '1px solid #334155',
                          backgroundColor: currentIndex === 0 ? 'rgba(15, 23, 42, 0.4)' : '#1e293b',
                          color: currentIndex === 0 ? '#475569' : '#f1f5f9',
                          cursor: currentIndex === 0 ? 'not-allowed' : 'pointer',
                        }}
                      >
                        ◀ 前の肢に戻る
                      </button>
                      <button
                        onClick={handleNext}
                        style={{ height: '48px', backgroundColor: '#4f46e5', borderRadius: '12px', fontWeight: 'bold', fontSize: '14px', color: '#ffffff', border: 'none', cursor: 'pointer', boxShadow: '0 4px 12px rgba(79, 70, 229, 0.4)' }}
                      >
                        {currentIndex < questions.length - 1 ? '次の肢へ進む ▶' : '演習結果を確認'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </main>

        {/* フッター */}
        <footer style={{ paddingTop: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', color: '#64748b', borderTop: '1px solid #0f172a', userSelect: 'none' }}>
          <button
            onClick={handlePrev}
            disabled={currentIndex === 0}
            style={{ padding: '4px 10px', borderRadius: '4px', color: currentIndex === 0 ? '#1e293b' : '#94a3b8', textDecoration: currentIndex === 0 ? 'none' : 'underline', background: 'none', border: 'none', cursor: currentIndex === 0 ? 'not-allowed' : 'pointer' }}
          >
            ◀ 前の問へ
          </button>
          <span style={{ fontFamily: 'monospace', fontSize: '11px', color: '#64748b' }}>{activeSummaryTag}</span>
          <button
            onClick={handleNext}
            disabled={questions.length === 0 || currentIndex === questions.length - 1}
            style={{ padding: '4px 10px', borderRadius: '4px', color: questions.length === 0 || currentIndex === questions.length - 1 ? '#1e293b' : '#94a3b8', textDecoration: questions.length === 0 || currentIndex === questions.length - 1 ? 'none' : 'underline', background: 'none', border: 'none', cursor: questions.length === 0 || currentIndex === questions.length - 1 ? 'not-allowed' : 'pointer' }}
          >
            スキップ ▶
          </button>
        </footer>
      </div>
    </div>
  );
}

export default function TantoPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', backgroundColor: '#020617', color: '#94a3b8', padding: '16px' }}>進捗を同期中...</div>}>
      <TantoPracticeContent />
    </Suspense>
  );
}
