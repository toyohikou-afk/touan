'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

type AnkiCard = {
  id: string;
  subject: string;
  title: string;
  issue: string;
  norm: string;
  keywords: string[];
};

const DEFAULT_CARDS: AnkiCard[] = [
  {
    id: 'card-1',
    subject: '刑法',
    title: '共犯からの離脱（着手前）',
    issue: '共謀に基づく実行着手前に離脱が認められるための要件は何か。',
    norm: '共犯関係からの離脱が認められるためには、離脱の意思表示と相手方の了承、または当初の共謀に基づく因果性の遮断（物理的・心理的因果性の除去）が必要である。凶器を提供した場合は、その回収等積極的除去が不可欠である。',
    keywords: ['離脱の意思表示', '相手方の了承', '因果性の遮断', '物理的・心理的因果性', '積極的除去']
  },
  {
    id: 'card-2',
    subject: '民法',
    title: '物上保証人の代位と後順位担保権者',
    issue: '物上保証人が弁済した場合、代位によって後順位抵当権者に対抗できるか。',
    norm: '物上保証人は、自らの財産をもって他人の債務を弁済した者であるから、債務者に対する求償権の範囲内で当然に債権者の有する担保権に代位する（民法501条）。代位の付記登記を経由していれば、後順位担保権者に対しても優先的効力を主張できる。',
    keywords: ['求償権の範囲内', '当然に代位', '付記登記', '優先的効力']
  },
  {
    id: 'card-3',
    subject: '憲法',
    title: '公の施設の利用制限と表現の自由',
    issue: '自治体が公の施設の利用を拒否・制限する際の合憲性判断基準は何か。',
    norm: '公の施設は住民の利用に供するために設置されたものであり、正当な理由がない限り利用を拒否できない（地方自治法244条2項）。集会の自由を制限する処分が合憲とされるためには、生命・身体・財産に具体的な危険が切迫し、警察等の警備によっても混乱を防止できない「明らかな差し迫った危険」が客観的事実に基づき認められなければならない。',
    keywords: ['正当な理由', '地方自治法244条2項', '明らかな差し迫った危険', '客観的事実', '警備による防止不能']
  }
];

type FontSizeLevel = 'sm' | 'base' | 'lg' | 'xl';

const fontSizes: Record<FontSizeLevel, { text: string; lh: string; label: string }> = {
  sm: { text: '13px', lh: '1.6', label: '小' },
  base: { text: '15px', lh: '1.75', label: '標準' },
  lg: { text: '17px', lh: '1.85', label: '大' },
  xl: { text: '20px', lh: '1.95', label: '特大' },
};

const SUBJECT_LIST = [
  '刑法', '民法', '憲法', '商法', '民事訴訟法', '刑事訴訟法', '行政法', '民事実務', '刑事実務', '租税法', '経済法'
];

export default function AnkiPage() {
  const [cards, setCards] = useState<AnkiCard[]>(DEFAULT_CARDS);
  const [selectedSubject, setSelectedSubject] = useState('ALL');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isMaskMode, setIsMaskMode] = useState(false);
  const [fontSize, setFontSize] = useState<FontSizeLevel>('base');
  const [adminQuery, setAdminQuery] = useState('');

  // 新規登録モーダル用ステート
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newSubject, setNewSubject] = useState('刑法');
  const [newTitle, setNewTitle] = useState('');
  const [newIssue, setNewIssue] = useState('');
  const [newNorm, setNewNorm] = useState('');
  const [newKeywords, setNewKeywords] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // ★ 編集モーダル用ステート
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editId, setEditId] = useState('');
  const [editSubject, setEditSubject] = useState('刑法');
  const [editTitle, setEditTitle] = useState('');
  const [editIssue, setEditIssue] = useState('');
  const [editNorm, setEditNorm] = useState('');
  const [editKeywords, setEditKeywords] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedFs = localStorage.getItem('touan_font_size') as FontSizeLevel;
      if (savedFs && fontSizes[savedFs]) setFontSize(savedFs);

      const params = new URLSearchParams(window.location.search);
      const admin = params.get('admin');
      if (admin) setAdminQuery(`?admin=${encodeURIComponent(admin)}`);
    }
    loadCards();
  }, []);

  const loadCards = async () => {
    try {
      const { data, error } = await supabase
        .from('anki_cards')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data && data.length > 0) {
        setCards(data);
      } else {
        setCards(DEFAULT_CARDS);
      }
    } catch (e) {
      console.warn('暗記カード取得エラー:', e);
      setCards(DEFAULT_CARDS);
    }
  };

  const changeFontSize = (level: FontSizeLevel) => {
    setFontSize(level);
    if (typeof window !== 'undefined') {
      localStorage.setItem('touan_font_size', level);
    }
  };

  const filteredCards = useMemo(() => {
    if (selectedSubject === 'ALL') return cards;
    return cards.filter((c) => c.subject === selectedSubject);
  }, [cards, selectedSubject]);

  const currentCard = filteredCards[currentIndex] || filteredCards[0] || DEFAULT_CARDS[0];

  const handleNext = () => {
    setIsFlipped(false);
    setCurrentIndex((prev) => (prev + 1) % filteredCards.length);
  };

  const handlePrev = () => {
    setIsFlipped(false);
    setCurrentIndex((prev) => (prev - 1 + filteredCards.length) % filteredCards.length);
  };

  // 新規カード登録処理
  const handleCreateCard = async () => {
    if (!newTitle.trim() || !newNorm.trim()) {
      alert('「論点名・タイトル」と「判例規範・理由づけ」を入力してください。');
      return;
    }

    setIsSaving(true);
    try {
      const newId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `card-${Date.now()}`;
      const kwArray = newKeywords
        .split(/[,、\s]+/)
        .map((k) => k.trim())
        .filter(Boolean);

      const cardData: AnkiCard = {
        id: newId,
        subject: newSubject,
        title: newTitle.trim(),
        issue: newIssue.trim() || `${newTitle.trim()}の成立要件・判断枠組みは何か。`,
        norm: newNorm.trim(),
        keywords: kwArray,
      };

      const { error } = await supabase.from('anki_cards').insert([cardData]);
      if (error) throw error;

      alert('新しい暗記カードを登録しました！');
      setIsCreateModalOpen(false);
      setNewTitle('');
      setNewIssue('');
      setNewNorm('');
      setNewKeywords('');

      await loadCards();
      setSelectedSubject(newSubject);
      setCurrentIndex(0);
      setIsFlipped(false);
    } catch (err: unknown) {
      alert(`カード登録エラー: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsSaving(false);
    }
  };

  // ★ 編集モーダルを開く
  const handleOpenEditModal = () => {
    setEditId(currentCard.id);
    setEditSubject(currentCard.subject);
    setEditTitle(currentCard.title);
    setEditIssue(currentCard.issue || '');
    setEditNorm(currentCard.norm || '');
    setEditKeywords((currentCard.keywords || []).join(', '));
    setIsEditModalOpen(true);
  };

  // ★ 編集の上書き保存処理
  const handleUpdateCard = async () => {
    if (!editTitle.trim() || !editNorm.trim()) {
      alert('「論点名・タイトル」と「判例規範・理由づけ」を入力してください。');
      return;
    }

    setIsUpdating(true);
    try {
      const kwArray = editKeywords
        .split(/[,、\s]+/)
        .map((k) => k.trim())
        .filter(Boolean);

      const updatedData = {
        subject: editSubject,
        title: editTitle.trim(),
        issue: editIssue.trim() || `${editTitle.trim()}の成立要件・判断枠組みは何か。`,
        norm: editNorm.trim(),
        keywords: kwArray,
      };

      const { error } = await supabase
        .from('anki_cards')
        .update(updatedData)
        .eq('id', editId);

      if (error) throw error;

      // ローカルステートを即座に更新
      setCards((prev) =>
        prev.map((c) => (c.id === editId ? { ...c, ...updatedData } : c))
      );

      alert('カードの内容を更新しました！');
      setIsEditModalOpen(false);
    } catch (err: unknown) {
      alert(`カード更新エラー: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsUpdating(false);
    }
  };

  // カード削除処理
  const handleDeleteCard = async () => {
    if (cards.length <= 1) {
      alert('これ以上削除できません。最低1枚のカードを保持する必要があります。');
      return;
    }

    const isConfirmed = window.confirm(
      `現在表示中のカード「[${currentCard.subject}] ${currentCard.title}」を削除しますか？`
    );
    if (!isConfirmed) return;

    try {
      const { error } = await supabase.from('anki_cards').delete().eq('id', currentCard.id);
      if (error) throw error;

      alert('カードを削除しました。');
      const remaining = cards.filter((c) => c.id !== currentCard.id);
      setCards(remaining);
      setCurrentIndex(0);
      setIsFlipped(false);
    } catch (err: unknown) {
      alert(`削除エラー: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  // 穴埋めマスク生成
  const renderMaskedNorm = (normText: string, keywords: string[]) => {
    if (!isMaskMode || !keywords || keywords.length === 0) return normText;
    let replaced = normText;
    keywords.forEach((kw) => {
      if (!kw) return;
      const regex = new RegExp(kw, 'g');
      replaced = replaced.replace(regex, `【 ＿＿＿＿ 】`);
    });
    return replaced;
  };

  return (
    <div style={{ height: 'calc(100vh - 56px)', backgroundColor: '#f1f5f9', color: '#0f172a', display: 'flex', flexDirection: 'column', fontFamily: 'sans-serif', overflow: 'hidden' }}>
      
      {/* 48pxスリムヘッダー */}
      <header style={{ height: '48px', backgroundColor: '#ffffff', borderBottom: '1px solid #cbd5e1', padding: '0 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 1px 2px rgba(0,0,0,0.04)', flexShrink: 0 }}>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '18px' }}>🗂️</span>
          <span style={{ fontSize: '13px', fontWeight: '900', color: '#0f172a' }}>論証暗記カード</span>

          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginLeft: '6px' }}>
            <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#64748b' }}>科目:</span>
            <select
              value={selectedSubject}
              onChange={(e) => {
                setSelectedSubject(e.target.value);
                setCurrentIndex(0);
                setIsFlipped(false);
              }}
              style={{
                fontSize: '12px',
                fontWeight: 'bold',
                padding: '3px 8px',
                borderRadius: '6px',
                border: '1.5px solid #2563eb',
                backgroundColor: '#eff6ff',
                color: '#1d4ed8',
                cursor: 'pointer',
                outline: 'none',
              }}
            >
              <option value="ALL">全科目 ({cards.length})</option>
              {SUBJECT_LIST.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          {/* 新規作成ボタン */}
          <button
            type="button"
            onClick={() => setIsCreateModalOpen(true)}
            style={{
              padding: '3px 10px',
              backgroundColor: '#10b981',
              color: '#ffffff',
              fontSize: '11px',
              fontWeight: '900',
              borderRadius: '6px',
              border: 'none',
              cursor: 'pointer',
              boxShadow: '0 1px 2px rgba(16,185,129,0.3)',
              display: 'flex',
              alignItems: 'center',
              gap: '2px',
            }}
          >
            ＋ 新規作成
          </button>

          <span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '4px', backgroundColor: '#e2e8f0', color: '#334155', fontWeight: 'bold' }}>
            {filteredCards.length > 0 ? `${currentIndex + 1} / ${filteredCards.length}` : '0 / 0'}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* 文字サイズボタン群 */}
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

          <Link
            href={`/practice${adminQuery}`}
            style={{
              padding: '4px 10px',
              backgroundColor: '#eff6ff',
              border: '1px solid #bfdbfe',
              borderRadius: '6px',
              fontSize: '11px',
              fontWeight: 'bold',
              color: '#1d4ed8',
              textDecoration: 'none',
            }}
          >
            ⚖️ CBT起案室へ進む
          </Link>
        </div>
      </header>

      {/* メインカード表示エリア */}
      <main style={{ flex: 1, padding: '24px 16px', overflowY: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ maxWidth: '680px', width: '100%', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          {/* カード本体 */}
          <div
            onClick={() => setIsFlipped(!isFlipped)}
            style={{
              backgroundColor: '#ffffff',
              border: '1.5px solid #cbd5e1',
              borderRadius: '16px',
              padding: '28px',
              boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)',
              minHeight: '260px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <span style={{ padding: '2px 8px', backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', color: '#1d4ed8', fontSize: '11px', fontWeight: 'bold', borderRadius: '4px' }}>
                  {currentCard.subject}
                </span>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 'bold', marginRight: '4px' }}>
                    {isFlipped ? '【裏面：判例規範】' : '【表面：問題提起】'}
                  </span>
                  
                  {/* ★ 編集ボタン */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenEditModal();
                    }}
                    style={{
                      padding: '2px 8px',
                      backgroundColor: '#eff6ff',
                      border: '1px solid #bfdbfe',
                      color: '#1d4ed8',
                      fontSize: '11px',
                      fontWeight: 'bold',
                      borderRadius: '4px',
                      cursor: 'pointer',
                    }}
                    title="このカードを編集"
                  >
                    ✏️ 編集
                  </button>

                  {/* 削除ボタン */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteCard();
                    }}
                    style={{
                      padding: '2px 8px',
                      backgroundColor: '#fff1f2',
                      border: '1px solid #fecdd3',
                      color: '#be123c',
                      fontSize: '11px',
                      fontWeight: 'bold',
                      borderRadius: '4px',
                      cursor: 'pointer',
                    }}
                    title="このカードを削除"
                  >
                    🗑️ 削除
                  </button>
                </div>
              </div>

              <h2 style={{ fontSize: '17px', fontWeight: 'bold', color: '#0f172a', margin: '0 0 12px 0' }}>
                {currentCard.title}
              </h2>

              {!isFlipped ? (
                <div style={{ fontSize: fontSizes[fontSize].text, lineHeight: fontSizes[fontSize].lh, color: '#334155', fontFamily: 'serif' }}>
                  {currentCard.issue}
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ fontSize: fontSizes[fontSize].text, lineHeight: fontSizes[fontSize].lh, color: '#0f172a', fontFamily: 'serif', whiteSpace: 'pre-wrap' }}>
                    {renderMaskedNorm(currentCard.norm, currentCard.keywords)}
                  </div>

                  {currentCard.keywords && currentCard.keywords.length > 0 && (
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '6px' }}>
                      {currentCard.keywords.map((kw, idx) => (
                        <span key={idx} style={{ padding: '2px 8px', backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '10px', color: '#475569', fontWeight: 'bold' }}>
                          #{kw}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div style={{ marginTop: '20px', paddingTop: '12px', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsMaskMode(!isMaskMode);
                }}
                style={{
                  padding: '3px 8px',
                  backgroundColor: isMaskMode ? '#fef08a' : '#f8fafc',
                  border: '1px solid #cbd5e1',
                  borderRadius: '4px',
                  fontSize: '11px',
                  fontWeight: 'bold',
                  color: '#854d0e',
                  cursor: 'pointer'
                }}
              >
                {isMaskMode ? '🔓 穴埋めマスク解除' : '🔒 重要語句をマスクする'}
              </button>

              <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                クリックで裏表切り替え
              </span>
            </div>
          </div>

          {/* 前へ・次へ コントロールバー */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
            <button
              type="button"
              onClick={handlePrev}
              style={{
                flex: 1,
                padding: '8px 16px',
                backgroundColor: '#ffffff',
                border: '1px solid #cbd5e1',
                borderRadius: '8px',
                fontSize: '12px',
                fontWeight: 'bold',
                color: '#334155',
                cursor: 'pointer'
              }}
            >
              ◀ 前のカード
            </button>
            <button
              type="button"
              onClick={handleNext}
              style={{
                flex: 1,
                padding: '8px 16px',
                backgroundColor: '#2563eb',
                border: 'none',
                borderRadius: '8px',
                fontSize: '12px',
                fontWeight: 'bold',
                color: '#ffffff',
                cursor: 'pointer'
              }}
            >
              次のカード ▶
            </button>
          </div>

        </div>
      </main>

      {/* 新規カード作成モーダル */}
      {isCreateModalOpen && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15,23,42,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 100, padding: '16px' }}>
          <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', maxWidth: '600px', width: '100%', maxHeight: '90vh', overflowY: 'auto', padding: '24px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '900', color: '#0f172a', margin: 0 }}>
                ➕ 新しい論証暗記カードを作成
              </h3>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', color: '#64748b' }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', gap: '12px' }}>
                <div style={{ flex: '0 0 130px' }}>
                  <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#475569', display: 'block', marginBottom: '4px' }}>科目</label>
                  <select
                    value={newSubject}
                    onChange={(e) => setNewSubject(e.target.value)}
                    style={{ width: '100%', padding: '8px', fontSize: '12px', border: '1px solid #cbd5e1', borderRadius: '6px', outline: 'none' }}
                  >
                    {SUBJECT_LIST.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>

                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#475569', display: 'block', marginBottom: '4px' }}>論点名・カードタイトル *</label>
                  <input
                    type="text"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="例: 共犯からの離脱（実行着手前）"
                    style={{ width: '100%', padding: '8px', fontSize: '12px', border: '1px solid #cbd5e1', borderRadius: '6px', outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#475569', display: 'block', marginBottom: '4px' }}>【表面】問題提起・検討課題</label>
                <textarea
                  value={newIssue}
                  onChange={(e) => setNewIssue(e.target.value)}
                  placeholder="例: 共謀に基づく実行着手前に離脱が認められるための要件は何か。"
                  style={{ width: '100%', height: '60px', padding: '8px', fontSize: '12px', border: '1px solid #cbd5e1', borderRadius: '6px', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#475569', display: 'block', marginBottom: '4px' }}>【裏面】判例規範・理由づけ *</label>
                <textarea
                  value={newNorm}
                  onChange={(e) => setNewNorm(e.target.value)}
                  placeholder="判例の規範定立、理由づけ、当てはめ基準を入力してください。"
                  style={{ width: '100%', height: '120px', padding: '10px', fontSize: '12px', fontFamily: 'serif', border: '1px solid #cbd5e1', borderRadius: '6px', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#475569', display: 'block', marginBottom: '4px' }}>穴埋めマスク用キーワード（カンマ区切り）</label>
                <input
                  type="text"
                  value={newKeywords}
                  onChange={(e) => setNewKeywords(e.target.value)}
                  placeholder="例: 因果性の遮断, 物理的・心理的因果性, 積極的除去"
                  style={{ width: '100%', padding: '8px', fontSize: '12px', border: '1px solid #cbd5e1', borderRadius: '6px', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', borderTop: '1px solid #e2e8f0', paddingTop: '12px' }}>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                style={{ padding: '6px 14px', backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}
              >
                キャンセル
              </button>
              <button
                type="button"
                onClick={handleCreateCard}
                disabled={isSaving}
                style={{ padding: '6px 18px', backgroundColor: '#10b981', color: '#ffffff', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold', cursor: isSaving ? 'not-allowed' : 'pointer' }}
              >
                {isSaving ? '保存中...' : 'カードを登録'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ★ 編集モーダル */}
      {isEditModalOpen && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15,23,42,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 100, padding: '16px' }}>
          <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', maxWidth: '600px', width: '100%', maxHeight: '90vh', overflowY: 'auto', padding: '24px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '900', color: '#0f172a', margin: 0 }}>
                ✏️ 論証暗記カードを編集
              </h3>
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', color: '#64748b' }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', gap: '12px' }}>
                <div style={{ flex: '0 0 130px' }}>
                  <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#475569', display: 'block', marginBottom: '4px' }}>科目</label>
                  <select
                    value={editSubject}
                    onChange={(e) => setEditSubject(e.target.value)}
                    style={{ width: '100%', padding: '8px', fontSize: '12px', border: '1px solid #cbd5e1', borderRadius: '6px', outline: 'none' }}
                  >
                    {SUBJECT_LIST.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>

                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#475569', display: 'block', marginBottom: '4px' }}>論点名・カードタイトル *</label>
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    style={{ width: '100%', padding: '8px', fontSize: '12px', border: '1px solid #cbd5e1', borderRadius: '6px', outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#475569', display: 'block', marginBottom: '4px' }}>【表面】問題提起・検討課題</label>
                <textarea
                  value={editIssue}
                  onChange={(e) => setEditIssue(e.target.value)}
                  style={{ width: '100%', height: '60px', padding: '8px', fontSize: '12px', border: '1px solid #cbd5e1', borderRadius: '6px', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#475569', display: 'block', marginBottom: '4px' }}>【裏面】判例規範・理由づけ *</label>
                <textarea
                  value={editNorm}
                  onChange={(e) => setEditNorm(e.target.value)}
                  style={{ width: '100%', height: '120px', padding: '10px', fontSize: '12px', fontFamily: 'serif', border: '1px solid #cbd5e1', borderRadius: '6px', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#475569', display: 'block', marginBottom: '4px' }}>穴埋めマスク用キーワード（カンマ区切り）</label>
                <input
                  type="text"
                  value={editKeywords}
                  onChange={(e) => setEditKeywords(e.target.value)}
                  style={{ width: '100%', padding: '8px', fontSize: '12px', border: '1px solid #cbd5e1', borderRadius: '6px', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', borderTop: '1px solid #e2e8f0', paddingTop: '12px' }}>
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                style={{ padding: '6px 14px', backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}
              >
                キャンセル
              </button>
              <button
                type="button"
                onClick={handleUpdateCard}
                disabled={isUpdating}
                style={{ padding: '6px 18px', backgroundColor: '#2563eb', color: '#ffffff', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold', cursor: isUpdating ? 'not-allowed' : 'pointer' }}
              >
                {isUpdating ? '更新中...' : '上書き保存'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
