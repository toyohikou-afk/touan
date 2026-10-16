'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';

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
  },
  {
    id: 'card-4',
    subject: '商法',
    title: '支配権移転新株発行の無効事由',
    issue: '経営権争奪下における新株発行が無効となる基準は何か。',
    norm: '会社法上、新株発行の無効事由は取引の安全に配慮して重大な法令・定款違反に限定される。経営権の維持・争奪を主要な目的として発行され、現経営陣の支配権維持を図る不公正発行（会社法247条2号）は、原則として差止事由にとどまるが、株主総会の決議を著しく無視した発行等、特段の事情がある場合には無効事由（828条1項2号）となり得る。',
    keywords: ['重大な法令・定款違反', '取引の安全', '主要目的ルール', '不公正発行', '特段の事情']
  },
  {
    id: 'card-5',
    subject: '民事訴訟法',
    title: '自己利用文書（民訴法220条4号ニ）',
    issue: '内部検討用の社内文書は自己利用文書として開示を拒絶できるか。',
    norm: '民事訴訟法220条4号ニの「専ら文書の所持者の利用に供するための文書」とは、外部への開示が予定されておらず、開示によって所持者に看過し難い不利益が生じるおそれがある文書をいう。作成目的、記載内容、利用形態、開示による不利益の重大性を総合勘案して判断する。',
    keywords: ['専ら所持者の利用に供する', '外部開示が非予定', '看過し難い不利益', '総合勘案']
  }
];

type FontSizeLevel = 'sm' | 'base' | 'lg' | 'xl';

const fontSizes: Record<FontSizeLevel, { text: string; lh: string; label: string }> = {
  sm: { text: '13px', lh: '1.6', label: '小' },
  base: { text: '15px', lh: '1.75', label: '標準' },
  lg: { text: '17px', lh: '1.85', label: '大' },
  xl: { text: '20px', lh: '1.95', label: '特大' },
};

export default function AnkiPage() {
  const [cards] = useState<AnkiCard[]>(DEFAULT_CARDS);
  const [selectedSubject, setSelectedSubject] = useState('ALL');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isMaskMode, setIsMaskMode] = useState(false);
  const [fontSize, setFontSize] = useState<FontSizeLevel>('base');
  const [adminQuery, setAdminQuery] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedFs = localStorage.getItem('touan_font_size') as FontSizeLevel;
      if (savedFs && fontSizes[savedFs]) setFontSize(savedFs);

      const params = new URLSearchParams(window.location.search);
      const admin = params.get('admin');
      if (admin) setAdminQuery(`?admin=${encodeURIComponent(admin)}`);
    }
  }, []);

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

  // 穴埋めマスク生成
  const renderMaskedNorm = (normText: string, keywords: string[]) => {
    if (!isMaskMode) return normText;
    let replaced = normText;
    keywords.forEach((kw) => {
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
              {['刑法', '民法', '憲法', '商法', '民事訴訟法'].map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          <span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '4px', backgroundColor: '#e2e8f0', color: '#334155', fontWeight: 'bold' }}>
            {currentIndex + 1} / {filteredCards.length}
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
                <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 'bold' }}>
                  {isFlipped ? '【裏面：判例規範・理由づけ】' : '【表面：論点・問題提起】（クリックで反転）'}
                </span>
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

                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '6px' }}>
                    {currentCard.keywords.map((kw, idx) => (
                      <span key={idx} style={{ padding: '2px 8px', backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '10px', color: '#475569', fontWeight: 'bold' }}>
                        #{kw}
                      </span>
                    ))}
                  </div>
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

    </div>
  );
}
