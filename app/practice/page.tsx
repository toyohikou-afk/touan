'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

// 主要六法マスターデータベース（自由検索対象）
const MASTER_STATUTES = [
  // 刑法
  { law: '刑法', num: '第60条', title: '共同正犯', text: '二人以上共同して犯罪を実行した者は、すべて正犯とする。' },
  { law: '刑法', num: '第61条', title: '教唆', text: '人を教唆して犯罪を実行させた者には、正犯の刑を科する。教唆者を教唆した者についても、同様とする。' },
  { law: '刑法', num: '第62条', title: '幇助', text: '正犯を幇助した者は、従犯とする。幇助者を教唆した者についても、同様とする。' },
  { law: '刑法', num: '第65条', title: '身分犯と共犯', text: '1 犯人の身分によって構成すべき犯罪行為に加担したときは、身分のない者であっても、共犯とする。\n2 身分によって特に刑の軽重があるときは、身分のない者には通常の刑を科する。' },
  { law: '刑法', num: '第43条', title: '未遂減免・中止犯', text: '犯罪の実行に着手してこれを遂げなかった者は、未遂罪として処断することができる。ただし、自己の意思により犯罪を中止したときは、その刑を減軽し、又は免除する。' },
  { law: '刑法', num: '第199条', title: '殺人', text: '人を殺した者は、死刑又は無期若しくは五年以上の懲役に処する。' },
  { law: '刑法', num: '第204条', title: '傷害', text: '人の身体を傷害した者は、十五年以下の懲役又は五十万円以下の罰金に処する。' },
  { law: '刑法', num: '第208条', title: '暴行', text: '暴行を加えた者が人を傷害するに至らなかったときは、二年以下の懲役若しくは三十万円以下の罰金又は拘留若しくは科料に処する。' },
  { law: '刑法', num: '第235条', title: '窃盗', text: '他人の財物を窃取した者は、窃盗の罪とし、十年以下の懲役又は五十万円以下の罰金に処する。' },
  { law: '刑法', num: '第236条', title: '強盗', text: '暴行又は脅迫を用いて他人の財物を強取した者は、強盗の罪とし、五年以上の有期懲役に処する。' },
  { law: '刑法', num: '第240条', title: '強盗致死傷', text: '強盗が、人を負傷させたときは無期又は六年以上の懲役に処し、死亡させたときは死刑又は無期懲役に処する。' },
  { law: '刑法', num: '第246条', title: '詐欺', text: '1 人を欺いて財物を交付させた者は、十年以下の懲役に処する。\n2 前項の方法により、財産上不法の利益を得、又は他人にこれを得させた者も、同項と同様とする。' },
  { law: '刑法', num: '第252条', title: '横領', text: '自己の占有する他人の物を横領した者は、五年以下の懲役に処する。' },
  // 民法
  { law: '民法', num: '第93条', title: '心裡留保', text: '意思表示は、表意者がその真意ではないことを知ってしたときであっても、そのためにその効力を妨げられない。ただし、相手方がその意思表示が表意者の真意ではないことを知り、又は知ることができたときは、その意思表示は、無効とする。' },
  { law: '民法', num: '第94条', title: '通謀虚偽表示', text: '1 相手方と通じてした虚偽の意思表示は、無効とする。\n2 前項の規定による意思表示の無効は、善意の第三者に対抗することができない。' },
  { law: '民法', num: '第95条', title: '錯誤', text: '意思表示は、次に掲げる錯誤に基づくものであって、その錯誤が法律行為の目的及び取引上の社会通念に照らして重要なものであるときは、取り消すことができる。' },
  { law: '民法', num: '第96条', title: '詐欺又は強迫', text: '1 詐欺又は強迫による意思表示は、取り消すことができる。\n2 相手方に対する意思表示について第三者が詐欺を行った場合においては、相手方がその事実を知り、又は知ることができたときに限り、その意思表示を取り消すことができる。' },
  { law: '民法', num: '第110条', title: '権限外の行為の表見代理', text: '前条本文の規定は、代理人がその権限外の行為をした場合において、第三者が代理人の権限があると信ずべき正当の理由があるときについて準用する。' },
  { law: '民法', num: '第177条', title: '不動産に関する物権の変動の対抗要件', text: '不動産に関する物権の得喪及び変更は、不動産登記法その他の登記に関する法律の定めるところに従いその登記をしなければ、第三者に対抗することができない。' },
  { law: '民法', num: '第709条', title: '不法行為による損害賠償', text: '故意又は過失によって他人の権利又は法律上保護される利益を侵害した者は、これによって生じた損害を賠償する責任を負う。' },
  // 憲法
  { law: '憲法', num: '第13条', title: '個人の尊重・幸福追求権', text: 'すべて国民は、個人として尊重される。生命、自由及び幸福追求に対する国民の権利については、公共の福祉に反しない限り、立法その他の国政の上で、最大の尊重を必要とする。' },
  { law: '憲法', num: '第14条', title: '法の下の平等', text: 'すべて国民は、法の下に平等であって、人種、信条、性別、社会的身分又は門地により、政治的、経済的又は社会的関係において、差別されない。' },
  { law: '憲法', num: '第21条', title: '表現の自由', text: '集会、結社及び言論、出版その他一切の表現の自由は、これを保障する。検閲は、これをしてはならない。通信の秘密は、これを侵してはならない。' }
];

type ProblemType = {
  id: string;
  subject: string;
  source_exam: string;
  target_issue: string;
  fact_context: string;
  time_limit_minutes: number;
  standard_norm?: string;
  key_facts?: string[];
  statutes?: { title: string; text: string }[];
};

type FontSizeLevel = 'sm' | 'base' | 'lg' | 'xl';

const fontSizes: Record<FontSizeLevel, { text: string; lh: string; label: string }> = {
  sm: { text: '13px', lh: '1.6', label: '小' },
  base: { text: '15px', lh: '1.75', label: '標準' },
  lg: { text: '17px', lh: '1.85', label: '大' },
  xl: { text: '20px', lh: '1.95', label: '特大' },
};

export default function PracticePage() {
  const router = useRouter();

  const [problem, setProblem] = useState<ProblemType>({
    id: 'a1111111-1111-1111-1111-111111111111',
    subject: '刑法',
    source_exam: '予備試験 論文式',
    target_issue: '共犯からの離脱・強盗致傷罪の共同正犯',
    fact_context: `【事実】
1. 甲は、乙と共に、夜間に一人暮らしの高齢女性V（75歳）方に押し入り、現金を強取することを計画した。
2. 計画当日、甲と乙はV方付近に赴き、甲はあらかじめ用意していた金属製バール（長さ約60センチメートル）及び粘着テープを乙に手渡した。甲の担当は見張りおよび逃走用車両の運転であり、乙の担当はV方に侵入して現金を奪うことであった。
3. 乙がバールを用いてV方の勝手口の施錠を破壊し、屋内に侵入しようとした直前、甲は急に罪悪感を覚え、「おい乙、やっぱりこんな危険なことはやめよう。引き返そう」と言って乙の肩を掴んだ。
4. しかし、乙は甲の手を激しく振り払い、「ここまで来てやめられるか！お前が逃げても俺は一人でやる」と言い放ち、そのまま屋内に侵入した。
5. 甲はその場に留まることなく、用意していた車両に乗って一人で現場を立ち去った。
6. 乙は屋内で物色中、目を覚ましたVに見つかったため、持っていたバールでVの頭部を強打して全治3週間の傷害を負わせ、現金100万円を強取して逃走した。

【設問】
甲の罪責を論ぜよ（建造物侵入罪の成否を除く）。`,
    time_limit_minutes: 70,
    standard_norm: '共犯関係からの離脱が認められるためには、離脱の意思表示と相手方の了承、または当初の共謀に基づく因果性の遮断（物理的・心理的影響の除去）が必要である。',
    key_facts: [
      '甲が主導的に計画を立て、凶器（バール）と粘着テープを乙に提供したこと',
      '着手直前に甲が離脱を申し出たが乙は拒絶して実行を継続したこと',
      '甲が提供したバールが実際に強盗および暴行（傷害結果）に使用されたこと',
      '甲が現場を立ち去ったのみで乙の犯行を積極的に制止しなかったこと'
    ],
    statutes: [
      { title: '刑法 第60条（共同正犯）', text: '二人以上共同して犯罪を実行した者は、すべて正犯とする。' },
      { title: '刑法 第240条（強盗致死傷）', text: '強盗が、人を負傷させたときは無期又は六年以上の懲役に処し、死亡させたときは死刑又は無期懲役に処する。' }
    ]
  });

  const [userDraft, setUserDraft] = useState('');
  const [activeTab, setActiveTab] = useState<'problem' | 'statute'>('problem');
  const [fontSize, setFontSize] = useState<FontSizeLevel>('base');
  const [secondsLeft, setSecondsLeft] = useState(70 * 60);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [aiFeedback, setAiFeedback] = useState<string | null>(null);

  // 六法検索ステート
  const [statuteSearchQuery, setStatuteSearchQuery] = useState('');
  const [statuteLawFilter, setStatuteLawFilter] = useState('ALL');

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // タイマー
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isTimerRunning && secondsLeft > 0) {
      timer = setInterval(() => setSecondsLeft((s) => s - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [isTimerRunning, secondsLeft]);

  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // AI採点・提出
  const handleSubmitEvaluation = async () => {
    if (!userDraft.trim()) {
      alert('答案本文が空です。起案を入力してください。');
      return;
    }

    if (!confirm('答案を提出し、Gemini AIによる考査委員基準採点を実行しますか？')) {
      return;
    }

    setIsEvaluating(true);
    setAiFeedback(null);

    const timeSpent = problem.time_limit_minutes * 60 - secondsLeft;

    try {
      const res = await fetch('/api/evaluate-draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userDraft,
          problemText: problem.fact_context,
          timeSpentSeconds: timeSpent,
          standardNorm: problem.standard_norm,
          keyFacts: problem.key_facts,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '採点リクエストに失敗しました');

      const feedback = data.feedback || '講評を受信できませんでした。';
      setAiFeedback(feedback);

      // Supabaseに保存
      try {
        await supabase.from('submissions').insert([
          {
            problem_id: problem.id,
            user_draft: userDraft,
            time_spent_seconds: timeSpent,
            ai_feedback: feedback,
          },
        ]);
      } catch (dbErr) {
        console.warn('DB保存スキップ（ローカル動作等）:', dbErr);
      }
    } catch (err: any) {
      alert(`採点エラー: ${err.message}`);
    } finally {
      setIsEvaluating(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f1f5f9', color: '#0f172a', display: 'flex', flexDirection: 'column', fontFamily: 'sans-serif' }}>
      
      {/* 1. 最上部ヘッダー */}
      <header style={{ backgroundColor: '#ffffff', borderBottom: '1px solid #cbd5e1', padding: '10px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '20px' }}>⚖️</span>
          <div>
            <h1 style={{ margin: 0, fontSize: '16px', fontWeight: 'bold', color: '#0f172a' }}>
              予備試験・司法試験 CBT起案シミュレーター
            </h1>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '2px' }}>
              <span style={{ backgroundColor: '#e0f2fe', color: '#0369a1', padding: '1px 6px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold' }}>
                {problem.subject}
              </span>
              <span style={{ fontSize: '12px', color: '#475569' }}>
                {problem.target_issue}
              </span>
            </div>
          </div>
        </div>

        {/* コントローラー：文字サイズ・タイマー・ダッシュボード遷移 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          {/* 文字サイズ調整 */}
          <div style={{ display: 'flex', alignItems: 'center', backgroundColor: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '2px 4px', gap: '3px' }}>
            <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#475569', marginRight: '4px' }}>🔍 文字</span>
            {(['sm', 'base', 'lg', 'xl'] as FontSizeLevel[]).map((level) => (
              <button
                key={level}
                type="button"
                onClick={() => setFontSize(level)}
                style={{
                  padding: '2px 7px',
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

          {/* タイマー */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: '#f8fafc', border: '1px solid #cbd5e1', padding: '3px 10px', borderRadius: '6px' }}>
            <span style={{ fontSize: '14px', fontWeight: 'bold', fontFamily: 'monospace', color: secondsLeft < 600 ? '#dc2626' : '#0f172a' }}>
              ⏱ {formatTimer(secondsLeft)}
            </span>
            <button
              type="button"
              onClick={() => setIsTimerRunning(!isTimerRunning)}
              style={{
                fontSize: '11px',
                padding: '2px 6px',
                borderRadius: '4px',
                border: '1px solid #94a3b8',
                backgroundColor: '#ffffff',
                cursor: 'pointer',
                fontWeight: 'bold',
              }}
            >
              {isTimerRunning ? '一時停止' : '開始'}
            </button>
          </div>

          <Link
            href="/dashboard"
            style={{
              padding: '6px 12px',
              backgroundColor: '#f1f5f9',
              border: '1px solid #cbd5e1',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: 'bold',
              color: '#334155',
              textDecoration: 'none',
            }}
          >
            📋 履歴一覧
          </Link>
        </div>
      </header>

      {/* 2. メイン作業エリア（左右2ペイン分割） */}
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'minmax(400px, 46%) minmax(440px, 54%)', height: 'calc(100vh - 65px)', overflow: 'hidden' }}>
        
        {/* 左ペイン：問題文 / 電子六法（自由検索可能） */}
        <section style={{ backgroundColor: '#ffffff', borderRight: '2px solid #cbd5e1', display: 'flex', flexDirection: 'column', height: '100%' }}>
          {/* タブ切り替え */}
          <div style={{ display: 'flex', borderBottom: '2px solid #e2e8f0', backgroundColor: '#f8fafc', padding: '0 12px' }}>
            <button
              type="button"
              onClick={() => setActiveTab('problem')}
              style={{
                padding: '10px 18px',
                fontSize: '13px',
                fontWeight: 'bold',
                border: 'none',
                background: 'none',
                cursor: 'pointer',
                borderBottom: activeTab === 'problem' ? '3px solid #0284c7' : '3px solid transparent',
                color: activeTab === 'problem' ? '#0284c7' : '#64748b',
              }}
            >
              📄 事実・設問
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('statute')}
              style={{
                padding: '10px 18px',
                fontSize: '13px',
                fontWeight: 'bold',
                border: 'none',
                background: 'none',
                cursor: 'pointer',
                borderBottom: activeTab === 'statute' ? '3px solid #0284c7' : '3px solid transparent',
                color: activeTab === 'statute' ? '#0284c7' : '#64748b',
              }}
            >
              📖 電子六法・参照条文
            </button>
          </div>

          {/* コンテンツ本体 */}
          <div style={{ flex: 1, padding: '18px', overflowY: 'auto', fontSize: fontSizes[fontSize].text, lineHeight: fontSizes[fontSize].lh }}>
            {activeTab === 'problem' ? (
              <div style={{ whiteSpace: 'pre-wrap', fontFamily: 'serif', color: '#1e293b' }}>
                {problem.fact_context}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {/* 🔍 自由検索バー & 法令クイックフィルター */}
                <div style={{ backgroundColor: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="text"
                      placeholder="条文番号または語句を入力 (例: 60, 240, 94, 強盗, 共犯, 詐欺, 錯誤)"
                      value={statuteSearchQuery}
                      onChange={(e) => setStatuteSearchQuery(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '8px 30px 8px 10px',
                        fontSize: '13px',
                        border: '1px solid #94a3b8',
                        borderRadius: '6px',
                        outline: 'none',
                        color: '#0f172a',
                        backgroundColor: '#ffffff',
                        boxSizing: 'border-box',
                      }}
                    />
                    {statuteSearchQuery && (
                      <button
                        type="button"
                        onClick={() => setStatuteSearchQuery('')}
                        style={{ position: 'absolute', right: '8px', top: '8px', border: 'none', background: 'none', color: '#64748b', cursor: 'pointer', fontSize: '12px' }}
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {['ALL', '刑法', '民法', '憲法'].map((law) => {
                      const isSel = statuteLawFilter === law;
                      return (
                        <button
                          key={law}
                          type="button"
                          onClick={() => setStatuteLawFilter(law)}
                          style={{
                            padding: '3px 10px',
                            fontSize: '11px',
                            fontWeight: 'bold',
                            borderRadius: '4px',
                            border: isSel ? '1px solid #0284c7' : '1px solid #cbd5e1',
                            backgroundColor: isSel ? '#0284c7' : '#ffffff',
                            color: isSel ? '#ffffff' : '#475569',
                            cursor: 'pointer',
                          }}
                        >
                          {law === 'ALL' ? '全法令' : law}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 検索結果条文リスト */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {(() => {
                    const combinedList = [
                      ...(problem.statutes || []).map((s) => ({
                        law: problem.subject || '本問法令',
                        num: '',
                        title: s.title,
                        text: s.text,
                      })),
                      ...MASTER_STATUTES,
                    ];

                    const q = statuteSearchQuery.trim().toLowerCase();
                    const filtered = combinedList.filter((item) => {
                      const matchLaw = statuteLawFilter === 'ALL' || item.law.includes(statuteLawFilter);
                      if (!q) return matchLaw;
                      const matchText = (item.text || '').toLowerCase().includes(q);
                      const matchTitle = (item.title || '').toLowerCase().includes(q);
                      const matchNum = (item.num || '').toLowerCase().includes(q);
                      return matchLaw && (matchText || matchTitle || matchNum);
                    });

                    if (filtered.length === 0) {
                      return (
                        <div style={{ padding: '30px 10px', textAlign: 'center', color: '#64748b', fontSize: '13px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px dashed #cbd5e1' }}>
                          「{statuteSearchQuery}」に一致する条文は見つかりませんでした。<br />
                          条文番号（例: 60）や主要なキーワードで検索してください。
                        </div>
                      );
                    }

                    return filtered.map((st, idx) => (
                      <div key={idx} style={{ backgroundColor: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '12px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ fontSize: '10px', fontWeight: 'bold', padding: '1px 6px', borderRadius: '4px', backgroundColor: '#e0f2fe', color: '#0369a1', border: '1px solid #bae6fd' }}>
                              {st.law}
                            </span>
                            <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#0f172a' }}>
                              {st.num ? `${st.num} ${st.title}` : st.title}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              const clipText = `【${st.law} ${st.num || ''} ${st.title}】\n${st.text}\n`;
                              navigator.clipboard.writeText(clipText);
                              alert(`${st.num || st.title} をコピーしました。起案エディタに貼り付けられます。`);
                            }}
                            style={{
                              fontSize: '11px',
                              color: '#0284c7',
                              border: '1px solid #bae6fd',
                              backgroundColor: '#ffffff',
                              padding: '2px 8px',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              fontWeight: 'bold',
                            }}
                          >
                            📋 引用コピー
                          </button>
                        </div>
                        <p style={{ margin: 0, fontSize: '12px', lineHeight: '1.65', color: '#334155', whiteSpace: 'pre-wrap', fontFamily: 'serif', borderLeft: '3px solid #cbd5e1', paddingLeft: '8px' }}>
                          {st.text}
                        </p>
                      </div>
                    ));
                  })()}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* 右ペイン：答案作成エディタ ＆ AI添削講評 */}
        <section style={{ backgroundColor: '#f8fafc', display: 'flex', flexDirection: 'column', height: '100%' }}>
          {/* エディタ上部ツールバー */}
          <div style={{ padding: '8px 16px', backgroundColor: '#ffffff', borderBottom: '1px solid #cbd5e1', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#334155' }}>✍️ 答案作成欄</span>
              <span style={{ fontSize: '12px', color: '#64748b' }}>
                文字数: <strong style={{ color: '#0f172a' }}>{userDraft.length}</strong> 字（約 {(userDraft.length / 690).toFixed(1)} 頁）
              </span>
            </div>

            <button
              type="button"
              onClick={handleSubmitEvaluation}
              disabled={isEvaluating}
              style={{
                backgroundColor: isEvaluating ? '#94a3b8' : '#0284c7',
                color: '#ffffff',
                padding: '6px 16px',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: 'bold',
                border: 'none',
                cursor: isEvaluating ? 'not-allowed' : 'pointer',
                boxShadow: '0 2px 4px rgba(2,132,199,0.2)',
              }}
            >
              {isEvaluating ? '⏳ AI採点・添削中...' : '🚀 答案提出・AI採点'}
            </button>
          </div>

          {/* 起案テキストエリア */}
          <div style={{ flex: aiFeedback ? '0 0 45%' : '1', padding: '12px', boxSizing: 'border-box', display: 'flex' }}>
            <textarea
              ref={textareaRef}
              value={userDraft}
              onChange={(e) => setUserDraft(e.target.value)}
              placeholder="ここに答案を作成してください（例：第１ 甲の罪責について...）"
              style={{
                width: '100%',
                height: '100%',
                border: '1px solid #cbd5e1',
                borderRadius: '8px',
                padding: '16px',
                fontSize: fontSizes[fontSize].text,
                lineHeight: fontSizes[fontSize].lh,
                fontFamily: 'serif',
                resize: 'none',
                outline: 'none',
                backgroundColor: '#ffffff',
                color: '#0f172a',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {/* AI採点・添削講評エリア（提出後に表示） */}
          {aiFeedback && (
            <div style={{ flex: '1', borderTop: '2px solid #cbd5e1', backgroundColor: '#fffdf5', padding: '16px', overflowY: 'auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#854d0e' }}>
                  ⚖️ AI採点・添削講評（Gemini 3.8 Flash）
                </span>
                <button
                  type="button"
                  onClick={() => setAiFeedback(null)}
                  style={{ fontSize: '11px', color: '#854d0e', border: '1px solid #fde047', backgroundColor: '#fef9c3', padding: '2px 8px', borderRadius: '4px', cursor: 'pointer' }}
                >
                  閉じる
                </button>
              </div>
              <div
                style={{
                  fontSize: fontSizes[fontSize].text,
                  lineHeight: fontSizes[fontSize].lh,
                  color: '#1e293b',
                  whiteSpace: 'pre-wrap',
                }}
              >
                {aiFeedback}
              </div>
            </div>
          )}
        </section>

      </div>
    </div>
  );
}
