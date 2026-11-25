'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import {
  SUBJECT_DRILL_GUIDES,
  MASTER_STATUTES,
  DEFAULT_PROBLEMS,
  SUBJECT_ORDER,
  ProblemType,
} from '@/lib/practiceData';

type GradingCostSummary = {
  inputTokens: number;
  outputTokens: number;
  thoughtsTokens: number;
  totalTokens: number;
  costUsd: number;
  costJpy: number;
};

type FontSizeLevel = 'sm' | 'base' | 'lg' | 'xl';

const fontSizes: Record<FontSizeLevel, { text: string; lh: string; label: string }> = {
  sm: { text: '13px', lh: '1.6', label: '小' },
  base: { text: '15px', lh: '1.75', label: '標準' },
  lg: { text: '17px', lh: '1.85', label: '大' },
  xl: { text: '20px', lh: '1.95', label: '特大' },
};

const dashboardNavStyle: React.CSSProperties = {
  padding: '4px 10px',
  backgroundColor: '#eff6ff',
  border: '1px solid #bfdbfe',
  borderRadius: '6px',
  fontSize: '11px',
  fontWeight: 'bold',
  color: '#1d4ed8',
  textDecoration: 'none',
};

const weaknessNavStyle: React.CSSProperties = {
  padding: '4px 10px',
  backgroundColor: '#f0fdf4',
  border: '1px solid #bbf7d0',
  borderRadius: '6px',
  fontSize: '11px',
  fontWeight: 'bold',
  color: '#15803d',
  textDecoration: 'none',
};

export default function PracticePage() {
  const [adminQuery, setAdminQuery] = useState('');
  const [adminKey, setAdminKey] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);

  const [problems, setProblems] = useState<ProblemType[]>(DEFAULT_PROBLEMS);
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState<string>('ALL');
  const [selectedProblemId, setSelectedProblemId] = useState<string>(DEFAULT_PROBLEMS[0].id);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newSubject, setNewSubject] = useState('刑法');
  const [newTitle, setNewTitle] = useState('');
  const [newFact, setNewFact] = useState('');
  const [newNorm, setNewNorm] = useState('');
  const [isSubmittingNewProblem, setIsSubmittingNewProblem] = useState(false);

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editSubject, setEditSubject] = useState('刑法');
  const [editTitle, setEditTitle] = useState('');
  const [editFact, setEditFact] = useState('');
  const [editNorm, setEditNorm] = useState('');
  const [isUpdatingProblem, setIsUpdatingProblem] = useState(false);

  const [userDraft, setUserDraft] = useState('');
  const [drillNotes, setDrillNotes] = useState('');
  const [activeTab, setActiveTab] = useState<'problem' | 'drill' | 'statute'>('problem');
  const [fontSize, setFontSize] = useState<FontSizeLevel>('base');

  const [secondsLeft, setSecondsLeft] = useState(70 * 60);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [aiFeedback, setAiFeedback] = useState<string | null>(null);
  const [latestCost, setLatestCost] = useState<GradingCostSummary | null>(null);
  const [syncStatus, setSyncStatus] = useState<'synced' | 'saving' | 'offline'>('synced');
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  const [statuteSearchQuery, setStatuteSearchQuery] = useState('');
  const [statuteLawFilter, setStatuteLawFilter] = useState('ALL');
  const [remoteStatutes, setRemoteStatutes] = useState<{ law: string; num: string; title: string; text: string }[]>([]);
  const [isSearchingStatutes, setIsSearchingStatutes] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const currentProblem = useMemo(() => {
    return problems.find((p) => p.id === selectedProblemId) || problems[0] || DEFAULT_PROBLEMS[0];
  }, [problems, selectedProblemId]);

  const availableSubjects = useMemo(() => {
    const subs = Array.from(new Set(problems.map((p) => p.subject).filter(Boolean)));
    return subs.sort((a, b) => {
      const idxA = SUBJECT_ORDER.indexOf(a);
      const idxB = SUBJECT_ORDER.indexOf(b);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return a.localeCompare(b);
    });
  }, [problems]);

  const filteredProblems = useMemo(() => {
    if (selectedSubjectFilter === 'ALL') return problems;
    const list = problems.filter((p) => p.subject === selectedSubjectFilter);
    if (currentProblem && !list.some((p) => p.id === currentProblem.id)) {
      return [currentProblem, ...list];
    }
    return list;
  }, [problems, selectedSubjectFilter, currentProblem]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedFs = localStorage.getItem('touan_font_size') as FontSizeLevel;
      if (savedFs && fontSizes[savedFs]) setFontSize(savedFs);

      const params = new URLSearchParams(window.location.search);
      const admin = params.get('admin') || params.get('ADMIN');
      if (admin) {
        setAdminQuery(`?admin=${encodeURIComponent(admin)}`);
        setAdminKey(admin);
        setIsAdmin(admin === process.env.NEXT_PUBLIC_ADMIN_KEY);
      } else {
        setIsAdmin(false);
      }
    }
    initSessionAndSyncLatest();
  }, []);

  useEffect(() => {
    if (activeTab !== 'statute') return;
    const timer = setTimeout(async () => {
      if (!statuteSearchQuery.trim() && statuteLawFilter === 'ALL') {
        setRemoteStatutes([]);
        return;
      }
      setIsSearchingStatutes(true);
      try {
        const params = new URLSearchParams({ law: statuteLawFilter, q: statuteSearchQuery.trim() });
        const res = await fetch(`/api/statutes/search?${params.toString()}`);
        if (res.ok) {
          const data = await res.json();
          setRemoteStatutes(data.statutes || []);
        }
      } catch (e) {
        console.error('電子六法API検索エラー:', e);
      } finally {
        setIsSearchingStatutes(false);
      }
    }, 350);
    return () => clearTimeout(timer);
  }, [activeTab, statuteSearchQuery, statuteLawFilter]);

  const changeFontSize = (level: FontSizeLevel) => {
    setFontSize(level);
    if (typeof window !== 'undefined') localStorage.setItem('touan_font_size', level);
  };

  const initSessionAndSyncLatest = async () => {
    try {
      const { data: probData } = await supabase.from('problems').select('*').order('created_at', { ascending: false });
      let allProblems = DEFAULT_PROBLEMS;
      if (probData && probData.length > 0) {
        const valid = probData.filter((d: ProblemType) => d.target_issue !== '刑法 第5問' && d.id !== 'a1111111-1111-1111-1111-111111111111');
        const normalized = valid.map((d: ProblemType) => ({ ...d, time_limit_minutes: 70 }));
        allProblems = [...normalized, ...DEFAULT_PROBLEMS.filter(dp => !normalized.some(d => d.id === dp.id))];
      }
      setProblems(allProblems);

      const { data: latestSubmission } = await supabase.from('submissions').select('problem_id, user_draft, created_at').order('created_at', { ascending: false }).limit(1).maybeSingle();
      const { data: latestDraft } = await supabase.from('practice_drafts').select('*').order('updated_at', { ascending: false }).limit(1).maybeSingle();

      let candidateProbId = allProblems[0].id;
      let initialDraftText = '';
      let initialDrillNotes = '';
      let initialSeconds = 70 * 60;

      const draftTime = latestDraft?.updated_at ? new Date(latestDraft.updated_at).getTime() : 0;
      const subTime = latestSubmission?.created_at ? new Date(latestSubmission.created_at).getTime() : 0;

      if (draftTime >= subTime && latestDraft?.problem_id && allProblems.some(p => p.id === latestDraft.problem_id)) {
        candidateProbId = latestDraft.problem_id;
        initialDraftText = latestDraft.user_draft || '';
        initialDrillNotes = latestDraft.drill_notes || '';
        if (latestDraft.seconds_left) initialSeconds = latestDraft.seconds_left;
      } else if (latestSubmission?.problem_id && allProblems.some(p => p.id === latestSubmission.problem_id)) {
        candidateProbId = latestSubmission.problem_id;
        initialDraftText = latestSubmission.user_draft || '';
      } else {
        const savedProbId = typeof window !== 'undefined' ? localStorage.getItem('touan_active_problem_id') : null;
        if (savedProbId && allProblems.some(p => p.id === savedProbId)) candidateProbId = savedProbId;
      }

      const matchedProb = allProblems.find(p => p.id === candidateProbId) || allProblems[0];
      setSelectedProblemId(matchedProb.id);
      setSelectedSubjectFilter('ALL');
      setUserDraft(initialDraftText);
      setDrillNotes(initialDrillNotes);
      setSecondsLeft(initialSeconds);
    } catch (e) {
      console.warn('起案セッション初期化スキップ:', e);
    }
  };

  const switchProblem = async (targetId: string) => {
    setSelectedProblemId(targetId);
    if (typeof window !== 'undefined') localStorage.setItem('touan_active_problem_id', targetId);
    try {
      const { data: draft } = await supabase.from('practice_drafts').select('*').eq('problem_id', targetId).maybeSingle();
      if (draft) {
        setUserDraft(draft.user_draft || '');
        setDrillNotes(draft.drill_notes || '');
        setSecondsLeft(draft.seconds_left && draft.seconds_left > 0 ? draft.seconds_left : 70 * 60);
      } else {
        setUserDraft('');
        setDrillNotes('');
        setSecondsLeft(70 * 60);
      }
    } catch {
      setUserDraft('');
      setDrillNotes('');
      setSecondsLeft(70 * 60);
    }
    setIsTimerRunning(false);
    setAiFeedback(null);
    setLatestCost(null);
    setSaveSuccessMsg(null);
  };

  const triggerAutoSave = (probId: string, draft: string, notes: string, sec: number) => {
    setSyncStatus('saving');
    if (autoSaveTimeoutRef.current) clearTimeout(autoSaveTimeoutRef.current);
    autoSaveTimeoutRef.current = setTimeout(async () => {
      try {
        await supabase.from('practice_drafts').upsert({
          problem_id: probId,
          user_draft: draft,
          drill_notes: notes,
          seconds_left: sec,
          updated_at: new Date().toISOString()
        });
        setSyncStatus('synced');
      } catch {
        setSyncStatus('offline');
      }
    }, 1500);
  };

  const handleDraftChange = (text: string) => {
    setUserDraft(text);
    triggerAutoSave(currentProblem.id, text, drillNotes, secondsLeft);
  };

  const handleDrillNotesChange = (text: string) => {
    setDrillNotes(text);
    triggerAutoSave(currentProblem.id, userDraft, text, secondsLeft);
  };

  const handleInsertDrillToDraft = () => {
    const drill = SUBJECT_DRILL_GUIDES[currentProblem.subject] || SUBJECT_DRILL_GUIDES['刑法'];
    const insertText = drillNotes.trim() ? drillNotes : drill.template;
    if (userDraft.trim() && !window.confirm('答案欄の末尾にドリルの構成メモを挿入しますか？')) return;
    handleDraftChange(userDraft ? `${userDraft}\n\n${insertText}` : insertText);
    alert('ドリルの構成メモを答案作成欄に反映しました！');
  };

  const handleSubjectChange = (newSubject: string) => {
    setSelectedSubjectFilter(newSubject);
    if (newSubject !== 'ALL') {
      const candidates = problems.filter((p) => p.subject === newSubject);
      if (candidates.length > 0 && !candidates.some((p) => p.id === currentProblem.id)) switchProblem(candidates[0].id);
    }
  };

  const handleCreateNewProblem = async () => {
    if (!isAdmin || !newTitle.trim() || !newFact.trim()) return;
    setIsSubmittingNewProblem(true);
    try {
      const newId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `prob-${Date.now()}`;
      const newProblemData: ProblemType = {
        id: newId,
        subject: newSubject,
        source_exam: '予備試験 論文式',
        target_issue: newTitle.trim(),
        time_limit_minutes: 70,
        fact_context: newFact.trim(),
        standard_norm: newNorm.trim() || '【規範定立・採点基準】問題文の事実と条文要件を対比して法的三段論法を展開すること。',
        key_facts: [],
        statutes: []
      };
      const { error } = await supabase.from('problems').insert([newProblemData]);
      if (error) throw error;
      alert('新しい問題を登録しました！');
      setIsAddModalOpen(false);
      setNewTitle('');
      setNewFact('');
      setNewNorm('');
      setProblems(prev => [newProblemData, ...prev]);
      switchProblem(newId);
    } catch (e: unknown) {
      alert(`問題登録エラー: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setIsSubmittingNewProblem(false);
    }
  };

  const handleOpenEditModal = () => {
    if (!isAdmin) return;
    setEditSubject(currentProblem.subject);
    setEditTitle(currentProblem.target_issue);
    setEditFact(currentProblem.fact_context);
    setEditNorm(currentProblem.standard_norm || '');
    setIsEditModalOpen(true);
  };

  const handleUpdateProblem = async () => {
    if (!isAdmin || !editTitle.trim() || !editFact.trim()) return;
    setIsUpdatingProblem(true);
    try {
      const updatedData = {
        subject: editSubject,
        target_issue: editTitle.trim(),
        fact_context: editFact.trim(),
        standard_norm: editNorm.trim() || '【規範定立・採点基準】問題文の事実と条文要件を対比して法的三段論法を展開すること。',
      };
      const { error } = await supabase.from('problems').update(updatedData).eq('id', currentProblem.id);
      if (error) throw error;
      setProblems((prev) => prev.map((p) => (p.id === currentProblem.id ? { ...p, ...updatedData } : p)));
      alert('問題の内容を更新しました！');
      setIsEditModalOpen(false);
    } catch (err: unknown) {
      alert(`問題更新エラー: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsUpdatingProblem(false);
    }
  };

  const handleDeleteCurrentProblem = async () => {
    if (!isAdmin || problems.length <= 1) return;
    if (!window.confirm(`現在表示中の問題「[${currentProblem.subject}] ${currentProblem.target_issue}」を削除しますか？`)) return;
    try {
      const { error } = await supabase.from('problems').delete().eq('id', currentProblem.id);
      if (error) throw error;
      alert('問題を削除しました。');
      const remaining = problems.filter((p) => p.id !== currentProblem.id);
      setProblems(remaining);
      switchProblem((remaining[0] || DEFAULT_PROBLEMS[0]).id);
    } catch (e: unknown) {
      alert(`問題削除エラー: ${e instanceof Error ? e.message : String(e)}`);
    }
  };

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isTimerRunning && secondsLeft > 0) {
      timer = setInterval(() => {
        setSecondsLeft((s) => {
          const nextSec = s - 1;
          if (nextSec % 30 === 0) triggerAutoSave(currentProblem.id, userDraft, drillNotes, nextSec);
          return nextSec;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isTimerRunning, secondsLeft, userDraft, drillNotes, currentProblem.id]);

  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleSubmitEvaluation = async () => {
    if (!isAdmin || !userDraft.trim()) return;
    if (!confirm('答案を提出し、Gemini AIによる考査委員基準採点を実行しますか？')) return;

    setIsEvaluating(true);
    setAiFeedback(null);
    setLatestCost(null);
    setSaveSuccessMsg(null);
    const timeSpent = 70 * 60 - secondsLeft;

    try {
      const res = await fetch('/api/evaluate-draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-key': adminKey },
        body: JSON.stringify({
          userDraft,
          drillNotes,
          problemText: currentProblem.fact_context,
          timeSpentSeconds: timeSpent,
          standardNorm: currentProblem.standard_norm,
          keyFacts: currentProblem.key_facts,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '採点リクエストに失敗しました');

      const feedback = data.feedback || '講評を受信できませんでした。';
      const cost: GradingCostSummary | null = data.cost ?? null;
      setAiFeedback(feedback);
      setLatestCost(cost);

      const { error: insertError } = await supabase.from('submissions').insert([{
        problem_id: currentProblem.id,
        user_draft: userDraft,
        time_spent_seconds: timeSpent,
        ai_feedback: feedback,
        input_tokens: cost?.inputTokens ?? 0,
        output_tokens: cost?.outputTokens ?? 0,
        thoughts_tokens: cost?.thoughtsTokens ?? 0,
        cost_usd: cost?.costUsd ?? 0,
        cost_jpy: cost?.costJpy ?? 0,
      }]);
      if (!insertError) setSaveSuccessMsg('✅ 答案履歴（ダッシュボード）に正常にアーカイブ保存されました！');
    } catch (err: unknown) {
      alert(`採点エラー: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsEvaluating(false);
    }
  };

  const currentDrill = SUBJECT_DRILL_GUIDES[currentProblem.subject] || SUBJECT_DRILL_GUIDES['刑法'];

  const normalizeQuery = (text?: string | null) => {
    if (!text) return '';
    return String(text).toLowerCase().replace(/[０-９]/g, (s) => String.fromCharCode(s.charCodeAt(0) - 0xfee0)).replace(/[第条]/g, '').trim();
  };

  return (
    <div style={{ height: 'calc(100vh - 56px)', backgroundColor: '#f1f5f9', color: '#0f172a', display: 'flex', flexDirection: 'column', fontFamily: 'sans-serif', overflow: 'hidden' }}>
      <header style={{ height: '48px', backgroundColor: '#ffffff', borderBottom: '1px solid #cbd5e1', padding: '0 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 1px 2px rgba(0,0,0,0.04)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '18px' }}>⚖️</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#64748b' }}>科目:</span>
            <select value={selectedSubjectFilter} onChange={(e) => handleSubjectChange(e.target.value)} style={{ fontSize: '12px', fontWeight: 'bold', padding: '3px 8px', borderRadius: '6px', border: '1.5px solid #2563eb', backgroundColor: '#eff6ff', color: '#1d4ed8', cursor: 'pointer', outline: 'none' }}>
              <option value="ALL">全科目 ({problems.length})</option>
              {availableSubjects.map((sub) => <option key={sub} value={sub}>{sub}</option>)}
            </select>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#64748b' }}>問題:</span>
            <select value={selectedProblemId} onChange={(e) => { if (e.target.value !== selectedProblemId) switchProblem(e.target.value); }} style={{ fontSize: '12px', fontWeight: 'bold', padding: '3px 8px', borderRadius: '6px', border: '1px solid #94a3b8', backgroundColor: '#ffffff', color: '#0f172a', cursor: 'pointer', outline: 'none', maxWidth: '280px' }}>
              {filteredProblems.map((p) => <option key={p.id} value={p.id}>[{p.subject}] {p.target_issue}</option>)}
            </select>
          </div>
          <span style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '4px', backgroundColor: syncStatus === 'synced' ? '#dcfce7' : syncStatus === 'saving' ? '#fef9c3' : '#fee2e2', color: syncStatus === 'synced' ? '#166534' : syncStatus === 'saving' ? '#854d0e' : '#991b1b', fontWeight: 'bold' }}>
            {syncStatus === 'synced' ? '☁️ 保存済' : '⏳ 保存中'}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', backgroundColor: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '2px 4px', gap: '2px' }}>
            <span style={{ fontSize: '10px', fontWeight: 'bold', color: '#475569', marginRight: '3px' }}>🔍</span>
            {(['sm', 'base', 'lg', 'xl'] as FontSizeLevel[]).map((level) => (
              <button key={level} type="button" onClick={() => changeFontSize(level)} style={{ padding: '2px 6px', fontSize: '11px', fontWeight: 'bold', borderRadius: '4px', border: fontSize === level ? '1px solid #0284c7' : 'none', backgroundColor: fontSize === level ? '#0284c7' : 'transparent', color: fontSize === level ? '#ffffff' : '#475569', cursor: 'pointer' }}>
                {fontSizes[level].label}
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: '#f8fafc', border: '1px solid #cbd5e1', padding: '2px 8px', borderRadius: '6px' }}>
            <span style={{ fontSize: '13px', fontWeight: 'bold', fontFamily: 'monospace', color: secondsLeft < 600 ? '#dc2626' : '#0f172a' }}>⏱ {formatTimer(secondsLeft)}</span>
            <button type="button" onClick={() => setIsTimerRunning(!isTimerRunning)} style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '4px', border: '1px solid #94a3b8', backgroundColor: '#ffffff', cursor: 'pointer', fontWeight: 'bold' }}>
              {isTimerRunning ? '一時停止' : '開始'}
            </button>
          </div>
          <Link href={`/dashboard${adminQuery}`} style={dashboardNavStyle}>📊 答案履歴</Link>
          <Link href={`/weakness${adminQuery}`} style={weaknessNavStyle}>🎯 弱点DB</Link>
        </div>
      </header>

      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'minmax(420px, 48%) minmax(440px, 52%)', height: 'calc(100vh - 104px)', overflow: 'hidden' }}>
        <section style={{ backgroundColor: '#ffffff', borderRight: '2px solid #cbd5e1', display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #e2e8f0', backgroundColor: '#f8fafc', padding: '0 8px', flexShrink: 0 }}>
            <div style={{ display: 'flex' }}>
              <button type="button" onClick={() => setActiveTab('problem')} style={{ padding: '10px 14px', fontSize: '12px', fontWeight: 'bold', border: 'none', background: 'none', cursor: 'pointer', borderBottom: activeTab === 'problem' ? '3px solid #0284c7' : '3px solid transparent', color: activeTab === 'problem' ? '#0284c7' : '#64748b' }}>📄 事実・設問</button>
              <button type="button" onClick={() => setActiveTab('drill')} style={{ padding: '10px 14px', fontSize: '12px', fontWeight: 'bold', border: 'none', background: 'none', cursor: 'pointer', borderBottom: activeTab === 'drill' ? '3px solid #2563eb' : '3px solid transparent', color: activeTab === 'drill' ? '#2563eb' : '#64748b' }}>📝 全科目起案ドリル・構成</button>
              <button type="button" onClick={() => setActiveTab('statute')} style={{ padding: '10px 14px', fontSize: '12px', fontWeight: 'bold', border: 'none', background: 'none', cursor: 'pointer', borderBottom: activeTab === 'statute' ? '3px solid #0284c7' : '3px solid transparent', color: activeTab === 'statute' ? '#0284c7' : '#64748b' }}>📖 電子六法</button>
            </div>
            {isAdmin && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <button type="button" onClick={() => setIsAddModalOpen(true)} style={{ padding: '4px 10px', backgroundColor: '#10b981', color: '#ffffff', fontSize: '11px', fontWeight: '900', borderRadius: '6px', border: 'none', cursor: 'pointer' }}>＋ 新規問題</button>
                <button type="button" onClick={handleOpenEditModal} style={{ padding: '4px 8px', backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', color: '#1d4ed8', fontSize: '11px', fontWeight: 'bold', borderRadius: '6px', cursor: 'pointer' }}>✏️ 編集</button>
                <button type="button" onClick={handleDeleteCurrentProblem} style={{ padding: '4px 8px', backgroundColor: '#fff1f2', border: '1px solid #fecdd3', color: '#be123c', fontSize: '11px', fontWeight: 'bold', borderRadius: '6px', cursor: 'pointer' }}>🗑️ 削除</button>
              </div>
            )}
          </div>

          <div style={{ flex: 1, padding: '16px', overflowY: 'auto', fontSize: fontSizes[fontSize].text, lineHeight: fontSizes[fontSize].lh }}>
            {activeTab === 'problem' && (
              <div style={{ whiteSpace: 'pre-wrap', fontFamily: 'serif', color: '#1e293b' }}>
                <div style={{ marginBottom: '12px', paddingBottom: '8px', borderBottom: '1px solid #e2e8f0', fontSize: '14px', fontWeight: 'bold', color: '#1d4ed8' }}>【{currentProblem.subject}】{currentProblem.target_issue}</div>
                {currentProblem.fact_context}
              </div>
            )}

            {activeTab === 'drill' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '8px', padding: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#1e40af' }}>⚡️ {currentDrill.title}</span>
                    <button type="button" onClick={handleInsertDrillToDraft} style={{ padding: '4px 10px', backgroundColor: '#2563eb', color: '#ffffff', fontSize: '11px', fontWeight: 'bold', borderRadius: '6px', border: 'none', cursor: 'pointer' }}>👉 答案欄に骨子を転送</button>
                  </div>
                  <p style={{ margin: 0, fontSize: '11px', color: '#3b82f6' }}>起案前の10分で即死地雷をチェックし、骨子を整理します。</p>
                </div>
                <div style={{ backgroundColor: '#fff1f2', border: '1px solid #fecdd3', borderRadius: '8px', padding: '12px' }}>
                  <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#9f1239', marginBottom: '6px' }}>🚨 考査委員の即死地雷（致命的減点項目）</div>
                  <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '11px', color: '#881337', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {currentDrill.fatalMistakes.map((mistake, idx) => <li key={idx}>{mistake}</li>)}
                  </ul>
                </div>
                <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px' }}>
                  <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#334155', marginBottom: '6px' }}>📐 答案思考フレームワーク</div>
                  <div style={{ fontSize: '11px', color: '#475569', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {currentDrill.logicFramework.map((fw, idx) => <div key={idx}>{fw}</div>)}
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#0f172a' }}>✍️ 答案構成・メモ欄（クラウド自動保存中）</span>
                    <button type="button" onClick={() => handleDrillNotesChange(currentDrill.template)} style={{ fontSize: '10px', color: '#2563eb', border: '1px solid #bfdbfe', backgroundColor: '#eff6ff', padding: '1px 6px', borderRadius: '4px', cursor: 'pointer' }}>標準テンプレを挿入</button>
                  </div>
                  <textarea value={drillNotes} onChange={(e) => handleDrillNotesChange(e.target.value)} placeholder="論点メモや構成順序をメモしてください。" style={{ width: '100%', height: '200px', padding: '10px', fontSize: '12px', fontFamily: 'monospace', border: '1px solid #cbd5e1', borderRadius: '6px', outline: 'none', backgroundColor: '#ffffff', boxSizing: 'border-box' }} />
                </div>
              </div>
            )}

            {activeTab === 'statute' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <form onSubmit={(e) => e.preventDefault()} style={{ backgroundColor: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <input type="text" placeholder="全条文検索：条文番号または語句 (例: 108, 無権代理, 94条2項)" value={statuteSearchQuery} onChange={(e) => setStatuteSearchQuery(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault(); }} style={{ flex: 1, padding: '8px 10px', fontSize: '13px', border: '1.5px solid #0284c7', borderRadius: '6px', outline: 'none', backgroundColor: '#ffffff', boxSizing: 'border-box' }} />
                    {statuteSearchQuery && <button type="button" onClick={() => setStatuteSearchQuery('')} style={{ padding: '6px 10px', fontSize: '11px', backgroundColor: '#e2e8f0', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>クリア</button>}
                  </div>
                  <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                    {['ALL', '憲法', '行政事件訴訟法', '民法', '商法', '会社法', '刑法', '刑事訴訟法', '民事訴訟法', '独占禁止法'].map((law) => (
                      <button key={law} type="button" onClick={() => setStatuteLawFilter(law)} style={{ padding: '3px 8px', fontSize: '11px', fontWeight: 'bold', borderRadius: '4px', border: statuteLawFilter === law ? '1px solid #0284c7' : '1px solid #cbd5e1', backgroundColor: statuteLawFilter === law ? '#0284c7' : '#ffffff', color: statuteLawFilter === law ? '#ffffff' : '#475569', cursor: 'pointer' }}>
                        {law === '行政事件訴訟法' ? '行政法' : law}
                      </button>
                    ))}
                  </div>
                </form>

                {isSearchingStatutes && <div style={{ padding: '12px', textAlign: 'center', fontSize: '12px', color: '#0284c7', fontWeight: 'bold', backgroundColor: '#f0f9ff', borderRadius: '6px' }}>⏳ e-Gov法令データベースから全条文を検索中...</div>}

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {(() => {
                    const localCombined = [
                      ...(currentProblem.statutes || []).map(s => ({ law: s.law || currentProblem.subject || '', num: s.num || '', title: s.title || '', text: s.text || '' })),
                      ...MASTER_STATUTES
                    ];
                    const qRaw = (statuteSearchQuery || '').trim();
                    const qNorm = normalizeQuery(qRaw);
                    const localFiltered = localCombined.filter(item => {
                      const matchLaw = statuteLawFilter === 'ALL' || item.law.includes(statuteLawFilter) || (statuteLawFilter === '商法' && item.law === '会社法');
                      if (!qRaw) return matchLaw;
                      return matchLaw && (normalizeQuery(item.num).includes(qNorm) || item.title.toLowerCase().includes(qRaw.toLowerCase()) || item.text.toLowerCase().includes(qRaw.toLowerCase()));
                    });
                    const mergedMap = new Map<string, { law: string; num: string; title: string; text: string }>();
                    for (const item of [...remoteStatutes, ...localFiltered]) {
                      const key = `${item.law}-${item.num}`;
                      if (!mergedMap.has(key)) mergedMap.set(key, item);
                    }
                    const finalResults = Array.from(mergedMap.values());
                    if (!isSearchingStatutes && finalResults.length === 0) {
                      return <div style={{ padding: '24px', textAlign: 'center', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px dashed #cbd5e1', color: '#64748b', fontSize: '12px' }}>該当する条文が見つかりませんでした。</div>;
                    }
                    return finalResults.map((st, idx) => (
                      <div key={idx} style={{ backgroundColor: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '10px', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                          <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#1d4ed8' }}>{st.law} {st.num} {st.title}</span>
                          <button type="button" onClick={() => { navigator.clipboard.writeText(`【${st.law} ${st.num} ${st.title}】\n${st.text}\n`); alert(`${st.law} ${st.num} をコピーしました`); }} style={{ fontSize: '10px', color: '#0284c7', border: '1px solid #bae6fd', backgroundColor: '#eff6ff', padding: '2px 6px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>📋 引用コピー</button>
                        </div>
                        <p style={{ margin: 0, fontSize: '12px', lineHeight: '1.65', color: '#334155', whiteSpace: 'pre-wrap', fontFamily: 'serif' }}>{st.text}</p>
                      </div>
                    ));
                  })()}
                </div>
              </div>
            )}
          </div>
        </section>

        <section style={{ backgroundColor: '#f8fafc', display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
          <div style={{ height: '40px', padding: '0 16px', backgroundColor: '#ffffff', borderBottom: '1px solid #cbd5e1', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#334155' }}>✍️ 答案作成欄</span>
              <span style={{ fontSize: '11px', color: '#64748b' }}>文字数: <strong style={{ color: '#0f172a' }}>{userDraft.length}</strong> 字（約 {(userDraft.length / 690).toFixed(1)} 頁）</span>
            </div>
            {isAdmin && (
              <button type="button" onClick={handleSubmitEvaluation} disabled={isEvaluating} style={{ backgroundColor: isEvaluating ? '#94a3b8' : '#2563eb', color: '#ffffff', padding: '4px 12px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold', border: 'none', cursor: isEvaluating ? 'not-allowed' : 'pointer' }}>
                {isEvaluating ? '⏳ 採点・講評中...' : '🚀 答案提出・AI厳格採点'}
              </button>
            )}
          </div>

          <div style={{ flex: aiFeedback ? '0 0 45%' : '1', padding: '10px', boxSizing: 'border-box', display: 'flex', overflow: 'hidden' }}>
            <textarea ref={textareaRef} value={userDraft} onChange={(e) => handleDraftChange(e.target.value)} placeholder={`【${currentProblem.target_issue}】の答案を作成してください。`} style={{ width: '100%', height: '100%', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '14px', fontSize: fontSizes[fontSize].text, lineHeight: fontSizes[fontSize].lh, fontFamily: 'serif', resize: 'none', outline: 'none', backgroundColor: '#ffffff', color: '#0f172a', boxSizing: 'border-box' }} />
          </div>

          {aiFeedback && (
            <div style={{ flex: '1', borderTop: '2px solid #cbd5e1', backgroundColor: '#fffdf5', padding: '14px', overflowY: 'auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#854d0e' }}>⚖️ 考査委員採点講評</span>
                <button type="button" onClick={() => setAiFeedback(null)} style={{ fontSize: '10px', color: '#854d0e', border: '1px solid #fde047', backgroundColor: '#fef9c3', padding: '1px 6px', borderRadius: '4px', cursor: 'pointer' }}>閉じる</button>
              </div>
              {saveSuccessMsg && <div style={{ padding: '8px 12px', backgroundColor: '#dcfce7', border: '1px solid #86efac', borderRadius: '6px', color: '#15803d', fontSize: '12px', fontWeight: 'bold', marginBottom: '8px' }}>{saveSuccessMsg}</div>}
              {latestCost && (
                <div style={{ padding: '6px 12px', backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '6px', color: '#334155', fontSize: '11px', marginBottom: '10px', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: '8px' }}>
                  <span style={{ fontWeight: 'bold', color: '#0f172a' }}>💴 採点コスト: 約 {latestCost.costJpy.toFixed(2)} 円（${latestCost.costUsd.toFixed(4)}）</span>
                  <span>入力: {latestCost.inputTokens.toLocaleString()} / 出力: {latestCost.outputTokens.toLocaleString()} / 思考: {latestCost.thoughtsTokens.toLocaleString()} tokens</span>
                </div>
              )}
              <div style={{ fontSize: fontSizes[fontSize].text, lineHeight: fontSizes[fontSize].lh, color: '#1e293b', whiteSpace: 'pre-wrap' }}>{aiFeedback}</div>
            </div>
          )}
        </section>
      </div>

      {isAdmin && isAddModalOpen && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15,23,42,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 100, padding: '16px' }}>
          <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', maxWidth: '640px', width: '100%', maxHeight: '90vh', overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '900', color: '#0f172a', margin: 0 }}>➕ 新しい演習問題を追加登録</h3>
              <button type="button" onClick={() => setIsAddModalOpen(false)} style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', color: '#64748b' }}>✕</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', gap: '12px' }}>
                <div style={{ flex: '0 0 140px' }}>
                  <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#475569', display: 'block', marginBottom: '4px' }}>科目</label>
                  <select value={newSubject} onChange={(e) => setNewSubject(e.target.value)} style={{ width: '100%', padding: '8px', fontSize: '12px', border: '1px solid #cbd5e1', borderRadius: '6px' }}>
                    {SUBJECT_ORDER.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#475569', display: 'block', marginBottom: '4px' }}>論点名・問題タイトル *</label>
                  <input type="text" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} style={{ width: '100%', padding: '8px', fontSize: '12px', border: '1px solid #cbd5e1', borderRadius: '6px', boxSizing: 'border-box' }} />
                </div>
              </div>
              <div>
                <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#475569', display: 'block', marginBottom: '4px' }}>問題文（事実・設問） *</label>
                <textarea value={newFact} onChange={(e) => setNewFact(e.target.value)} style={{ width: '100%', height: '180px', padding: '10px', fontSize: '12px', fontFamily: 'serif', border: '1px solid #cbd5e1', borderRadius: '6px', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#475569', display: 'block', marginBottom: '4px' }}>出題趣旨・判例の規範定立（任意）</label>
                <textarea value={newNorm} onChange={(e) => setNewNorm(e.target.value)} style={{ width: '100%', height: '80px', padding: '8px', fontSize: '11px', border: '1px solid #cbd5e1', borderRadius: '6px', boxSizing: 'border-box' }} />
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', borderTop: '1px solid #e2e8f0', paddingTop: '12px' }}>
              <button type="button" onClick={() => setIsAddModalOpen(false)} style={{ padding: '6px 14px', backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}>キャンセル</button>
              <button type="button" onClick={handleCreateNewProblem} disabled={isSubmittingNewProblem} style={{ padding: '6px 18px', backgroundColor: '#059669', color: '#ffffff', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}>{isSubmittingNewProblem ? '保存中...' : '登録して起案を開始'}</button>
            </div>
          </div>
        </div>
      )}

      {isAdmin && isEditModalOpen && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15,23,42,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 100, padding: '16px' }}>
          <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', maxWidth: '640px', width: '100%', maxHeight: '90vh', overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '900', color: '#0f172a', margin: 0 }}>✏️ 演習問題を編集</h3>
              <button type="button" onClick={() => setIsEditModalOpen(false)} style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', color: '#64748b' }}>✕</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', gap: '12px' }}>
                <div style={{ flex: '0 0 140px' }}>
                  <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#475569', display: 'block', marginBottom: '4px' }}>科目</label>
                  <select value={editSubject} onChange={(e) => setEditSubject(e.target.value)} style={{ width: '100%', padding: '8px', fontSize: '12px', border: '1px solid #cbd5e1', borderRadius: '6px' }}>
                    {SUBJECT_ORDER.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#475569', display: 'block', marginBottom: '4px' }}>論点名・問題タイトル *</label>
                  <input type="text" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} style={{ width: '100%', padding: '8px', fontSize: '12px', border: '1px solid #cbd5e1', borderRadius: '6px', boxSizing: 'border-box' }} />
                </div>
              </div>
              <div>
                <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#475569', display: 'block', marginBottom: '4px' }}>問題文（事実・設問） *</label>
                <textarea value={editFact} onChange={(e) => setEditFact(e.target.value)} style={{ width: '100%', height: '180px', padding: '10px', fontSize: '12px', fontFamily: 'serif', border: '1px solid #cbd5e1', borderRadius: '6px', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#475569', display: 'block', marginBottom: '4px' }}>出題趣旨・判例の規範定立（任意）</label>
                <textarea value={editNorm} onChange={(e) => setEditNorm(e.target.value)} style={{ width: '100%', height: '80px', padding: '8px', fontSize: '11px', border: '1px solid #cbd5e1', borderRadius: '6px', boxSizing: 'border-box' }} />
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', borderTop: '1px solid #e2e8f0', paddingTop: '12px' }}>
              <button type="button" onClick={() => setIsEditModalOpen(false)} style={{ padding: '6px 14px', backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}>キャンセル</button>
              <button type="button" onClick={handleUpdateProblem} disabled={isUpdatingProblem} style={{ padding: '6px 18px', backgroundColor: '#2563eb', color: '#ffffff', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}>{isUpdatingProblem ? '更新中...' : '上書き保存'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
