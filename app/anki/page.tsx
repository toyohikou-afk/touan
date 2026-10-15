'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';

interface RonshoCard {
  id: string;
  subject: string;
  rank: 'A' | 'B' | 'C';
  title: string;
  issue: string;
  standardNorm: string; // 判例の規範定立
  subsumptionStandard: string; // 当てはめ基準
  keyTerms: string[]; // 穴埋めマスク対象キーワード
}

const PRESET_RONSHO: RonshoCard[] = [
  // 刑法
  {
    id: 'crim-1',
    subject: '刑法',
    rank: 'A',
    title: '共犯関係からの離脱（着手前・着手後）',
    issue: '共謀した者が実行着手前または着手後に離脱を表明した場合、その後の結果につき共犯としての責任を負うか。',
    standardNorm: '共犯の処罰根拠は、共犯者が相互に利用・補充し合って犯罪結果を惹起した点（因果的共犯論）にある。したがって、離脱が認められるためには、離脱の意思表示と相手方の了承、または当初の共謀に基づく因果性の遮断（物理的・心理的因果性の除去）が必要である。凶器を提供した場合は、その回収等の積極的除去が不可欠である。',
    subsumptionStandard: '①離脱表明の時期（着手前か実行中か）、②当初の共謀における役割の重要度（主導者か従属者か）、③提供した凶器等の物理的影響の除去（回収したか否か）、④心理的因果性の解消（相手方が納得したか、翻意を促したか）を総合考慮する。',
    keyTerms: ['因果的共犯論', '因果性の遮断', '物理的・心理的因果性', '積極的除去']
  },
  {
    id: 'crim-2',
    subject: '刑法',
    rank: 'A',
    title: '承継的共同正犯の成立限界',
    issue: '先行者の暴行により被害者が反抗抑圧状態に陥った後、後行者が共謀加担して財物を強取した場合、強盗罪の共同正犯が成立するか。',
    standardNorm: '共犯の処罰根拠は自己の行為が結果に対して因果性を及ぼした点にあるから、途中関与者は、自らの関与前の先行行為及びその結果については、これを自己の犯罪遂行のために積極的に利用したとしても原則として責任を負わない（最判平24.11.6）。ただし、先行暴行による反抗抑圧状態を利用して新たな侵害結果を生じさせた限度での正犯性が問題となる。',
    subsumptionStandard: '①関与時点における先行行為の終了度合い、②関与後に新たな暴行・脅迫や結果の重篤化を生じさせたか、③先行状態の単なる利用にとどまるか否かを検討し、承継前の傷害結果等について罪責を負わせない。',
    keyTerms: ['因果的共犯論', '途中関与者', '先行行為及びその結果', '責任を負わない']
  },
  // 民法
  {
    id: 'civ-1',
    subject: '民法',
    rank: 'A',
    title: '94条2項類推適用（外観法理と本人の帰責性）',
    issue: '本人が自ら虚偽の意思表示をしていないが、不実の登記を放置していた場合、善意の第三者は保護されるか。',
    standardNorm: '民法94条2項は外観信頼保護の法理を定めた規定であるから、①不実の登記等の虚偽の外観が存在し、②これにつき本人に自ら外観を作出し又は容認していた等の帰責性があり、③第三者がその外観を信頼して取引関係に入った場合には、同項が類推適用され、本人は第三者に対して外観通りの権利関係を否定できない。第三者が無過失まで必要かは、本人の帰責性の軽重（110条類推適用の要否）に応じて相関的に判断する。',
    subsumptionStandard: '①虚偽の外観の存在、②本人の帰責性（積極的作出なら善意で足り、単なる放置なら善意無過失を要する）、③第三者の正当な信頼を対比して要件充足を判定する。',
    keyTerms: ['外観信頼保護', '虚偽の外観', '本人の帰責性', '類推適用']
  },
  {
    id: 'civ-2',
    subject: '民法',
    rank: 'A',
    title: '物上保証人の代位と後順位抵当権者（民法501条、392条）',
    issue: '債務者所有不動産と物上保証人所有不動産の共同抵当において、物上保証人所有物件が先行競売された場合、物上保証人は主債務者所有不動産に代位できるか。',
    standardNorm: '物上保証人が担保不動産の競売により所有権を失った場合、主債務者に対する求償権（民法351条）を取得し、弁済者代位（500条、501条）により債権者が有していた抵当権を実行できる。債務者所有不動産の後順位抵当権者は、物上保証人の代位によって制約された担保余剰価値しか期待し得ないため、物上保証人の代位権が後順位抵当権者に優先する。',
    subsumptionStandard: '物上保証人の弁済者代位権（求償権担保）を優先させ、債務者不動産の後順位抵当権者を劣後させる。物上保証人側の後順位抵当権者は当該代位権に物上代位可能である。',
    keyTerms: ['求償権', '弁済者代位', '物上保証人の代位', '後順位抵当権者']
  },
  // 憲法
  {
    id: 'con-1',
    subject: '憲法',
    rank: 'A',
    title: '公の施設の利用拒否と明白な危険の基準',
    issue: '反対派市民の抗議や混乱が予測されることを理由に、地方自治体が公の施設の利用承認を拒否できるか。',
    standardNorm: '公の施設（地方自治法244条）は住民の利用に供されるパブリックフォーラムであり、その利用拒否は集会の自由（憲法21条1項）に対する事前抑制に準じる。正当な理由として利用を拒絶できるのは、「人の生命、身体又は財産が侵害され、公共の安全が損なわれることが、客観的な事実に照らして具体的に明らかに予測される場合（明白な危険）」に限られる（泉佐野市民会館事件）。単なる騒乱のおそれや反対派の敵意ある抗議のみを理由に拒否することは許されない。',
    subsumptionStandard: '①警察警備による混乱回避可能性を尽くしたか、②危害発生の具体的蓋然性が客観的証拠に基づいているか、③主催者側の落ち度と反対派の違法行為の峻別を検討する。',
    keyTerms: ['パブリックフォーラム', '事前抑制', '客観的な事実', '明白な危険']
  },
  // 刑訴法
  {
    id: 'crp-1',
    subject: '刑事訴訟法',
    rank: 'A',
    title: '訴因変更の限界と公訴事実の同一性（312条1項）',
    issue: '保護責任者遺棄罪から死体遺棄罪への予備的訴因の追加は「公訴事実の同一性」を害しないか。',
    standardNorm: '公訴事実の同一性（刑訴法312条1項）は、基本的事実関係が同一であるか否かを基準として判断する。具体的には、①犯行の日時・場所・行為態様・被害者等の共通性、②両訴因が歴史的・社会的事象として同一の事件を捉えたものといえるかを考慮する。客体の生死という評価の差異があっても、一連の遺棄行為という同一の歴史的事象を捉えている限り、同一性は肯定される。',
    subsumptionStandard: '運搬・遺棄の日時・場所が同一であり、客体の生死の評価の食い違いにすぎない場合、基本的事実関係の同一性を認めて訴因変更（予備的追加）を許可する。',
    keyTerms: ['基本的事実関係が同一', '歴史的・社会的事象', '客体の生死', '予備的追加']
  }
];

export default function AnkiPage() {
  const [adminQuery, setAdminQuery] = useState('');
  const [cards] = useState<RonshoCard[]>(PRESET_RONSHO);
  const [selectedSubject, setSelectedSubject] = useState<string>('ALL');
  const [selectedRank, setSelectedRank] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  
  // 表示モード：flashcard（1問1答） ⇄ list（一覧）
  const [viewMode, setViewMode] = useState<'flashcard' | 'list'>('flashcard');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [maskActive, setMaskActive] = useState(true);

  // 暗記ステータス（localStorageで永続化）
  const [learnedMap, setLearnedMap] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const admin = params.get('admin');
      if (admin) setAdminQuery(`?admin=${encodeURIComponent(admin)}`);
      
      const saved = localStorage.getItem('yobi_anki_learned_status');
      if (saved) {
        try { setLearnedMap(JSON.parse(saved)); } catch (e) {}
      }
    }
  }, []);

  const saveLearnedStatus = (id: string, learned: boolean) => {
    const updated = { ...learnedMap, [id]: learned };
    setLearnedMap(updated);
    if (typeof window !== 'undefined') {
      localStorage.setItem('yobi_anki_learned_status', JSON.stringify(updated));
    }
  };

  const filteredCards = useMemo(() => {
    return cards.filter((c) => {
      if (selectedSubject !== 'ALL' && c.subject !== selectedSubject) return false;
      if (selectedRank !== 'ALL' && c.rank !== selectedRank) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return c.title.toLowerCase().includes(q) || c.issue.toLowerCase().includes(q) || c.standardNorm.toLowerCase().includes(q);
      }
      return true;
    });
  }, [cards, selectedSubject, selectedRank, searchQuery]);

  const currentCard = filteredCards[currentIndex] || filteredCards[0];

  const handleNext = () => {
    setIsFlipped(false);
    setCurrentIndex((prev) => (prev + 1) % Math.max(filteredCards.length, 1));
  };

  const handlePrev = () => {
    setIsFlipped(false);
    setCurrentIndex((prev) => (prev - 1 + filteredCards.length) % Math.max(filteredCards.length, 1));
  };

  // 穴埋めマスク処理
  const renderMaskedText = (text: string, terms: string[]) => {
    if (!maskActive) return text;
    let rendered = text;
    terms.forEach((t) => {
      const reg = new RegExp(t, 'g');
      rendered = rendered.replace(reg, `【  ???  】`);
    });
    return rendered;
  };

  const learnedCount = Object.values(learnedMap).filter(Boolean).length;
  const progressPercent = Math.round((learnedCount / Math.max(cards.length, 1)) * 100);

  return (
    <div className="min-h-[calc(100vh-56px)] bg-slate-100 text-slate-800 py-6 px-4 sm:px-6 font-sans">
      <div className="max-w-4xl mx-auto space-y-4">
        
        {/* ヘッダー・進捗バー */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row justify-between items-center gap-3">
          <div>
            <h1 className="text-lg font-black text-slate-900 flex items-center gap-2">
              📇 予備試験・司法試験 論証暗記カード
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              判例規範定立・当てはめ基準を正確にインプットし、反射速度を鍛えます。
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right">
              <span className="text-[11px] text-slate-500">暗記完了: </span>
              <strong className="text-xs text-blue-700 font-mono">{learnedCount} / {cards.length}</strong>
              <span className="text-[10px] text-slate-400"> ({progressPercent}%)</span>
            </div>
            <Link
              href={`/practice${adminQuery}`}
              className="px-3 py-1.5 bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-blue-700 transition"
            >
              ⚖️ 起案室へ進む
            </Link>
          </div>
        </div>

        {/* コントロールパネル：科目タブ ＆ 検索フィルター */}
        <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm space-y-3">
          {/* 科目クイックタブ */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs font-bold">
            {['ALL', '憲法', '民法', '刑法', '刑事訴訟法'].map((sub) => (
              <button
                key={sub}
                onClick={() => { setSelectedSubject(sub); setCurrentIndex(0); setIsFlipped(false); }}
                className={`px-3 py-1 rounded-full shrink-0 transition ${selectedSubject === sub ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
              >
                {sub === 'ALL' ? '全科目' : sub}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 pt-2 border-t border-slate-100 items-center">
            <div className="sm:col-span-6 relative">
              <input
                type="text"
                placeholder="論点名・判例キーワードを検索..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full text-xs pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg outline-none focus:bg-white"
              />
              <span className="absolute left-2.5 top-2 text-slate-400 text-xs">🔍</span>
            </div>

            <div className="sm:col-span-3 flex items-center gap-2">
              <span className="text-[11px] font-bold text-slate-500">重要度:</span>
              <select
                value={selectedRank}
                onChange={(e) => setSelectedRank(e.target.value)}
                className="text-xs p-1.5 border border-slate-300 rounded-lg bg-slate-50 outline-none w-full"
              >
                <option value="ALL">すべて</option>
                <option value="A">ランクA（超重要）</option>
                <option value="B">ランクB</option>
              </select>
            </div>

            <div className="sm:col-span-3 flex justify-end items-center gap-2">
              <button
                onClick={() => setMaskActive(!maskActive)}
                className={`text-[11px] font-bold px-2.5 py-1 rounded border transition ${maskActive ? 'bg-amber-100 text-amber-900 border-amber-300' : 'bg-slate-100 text-slate-600 border-slate-300'}`}
              >
                {maskActive ? '🙈 穴埋めON' : '👁 穴埋めOFF'}
              </button>

              <button
                onClick={() => setViewMode(viewMode === 'flashcard' ? 'list' : 'flashcard')}
                className="text-[11px] font-bold px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded border border-slate-300"
              >
                {viewMode === 'flashcard' ? '📋 リスト表示' : '🎴 カード表示'}
              </button>
            </div>
          </div>
        </div>

        {/* 1問1答フラッシュカードモード */}
        {viewMode === 'flashcard' && currentCard && (
          <div className="space-y-4">
            <div
              onClick={() => setIsFlipped(!isFlipped)}
              className="bg-white border-2 border-slate-200 hover:border-blue-400 rounded-2xl p-6 sm:p-8 shadow-sm cursor-pointer transition min-h-[320px] flex flex-col justify-between"
            >
              <div>
                <div className="flex justify-between items-center mb-3">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded font-bold text-[11px]">
                      {currentCard.subject}
                    </span>
                    <span className="px-1.5 py-0.5 bg-rose-100 text-rose-700 rounded font-bold text-[11px]">
                      ★ ランク{currentCard.rank}
                    </span>
                  </div>
                  <span className="text-xs text-slate-400 font-mono">
                    {currentIndex + 1} / {filteredCards.length}
                  </span>
                </div>

                <h2 className="text-base sm:text-lg font-bold text-slate-900 mb-2">
                  {currentCard.title}
                </h2>
                <p className="text-xs sm:text-sm text-slate-600 mb-4 bg-slate-50 p-3 rounded-lg border border-slate-200 font-serif">
                  <strong>【問題の所在】</strong> {currentCard.issue}
                </p>
              </div>

              {/* カード裏面（タップで表示） */}
              {isFlipped ? (
                <div className="space-y-4 pt-4 border-t border-slate-100 animate-fadeIn">
                  <div className="bg-blue-50/60 border border-blue-200 rounded-xl p-4">
                    <span className="text-[11px] font-bold text-blue-900 block mb-1">
                      ⚖️ 判例の規範定立（理由づけ・論証）
                    </span>
                    <p className="text-xs sm:text-sm leading-relaxed text-slate-900 font-serif whitespace-pre-wrap">
                      {renderMaskedText(currentCard.standardNorm, currentCard.keyTerms)}
                    </p>
                  </div>

                  <div className="bg-amber-50/60 border border-amber-200 rounded-xl p-4">
                    <span className="text-[11px] font-bold text-amber-900 block mb-1">
                      📐 当てはめ基準・考慮要素
                    </span>
                    <p className="text-xs sm:text-sm leading-relaxed text-slate-900 font-serif whitespace-pre-wrap">
                      {currentCard.subsumptionStandard}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-slate-400 text-xs font-bold">
                  👆 クリックして【判例規範・当てはめ基準】を開く
                </div>
              )}
            </div>

            {/* ナビゲーション ＆ 暗記ステータスボタン */}
            <div className="flex justify-between items-center gap-3">
              <button
                onClick={handlePrev}
                className="px-4 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold hover:bg-slate-50"
              >
                ◀ 前の論点
              </button>

              <div className="flex gap-2">
                <button
                  onClick={() => { saveLearnedStatus(currentCard.id, false); handleNext(); }}
                  className="px-4 py-2 bg-rose-50 border border-rose-300 text-rose-700 text-xs font-bold rounded-xl hover:bg-rose-100"
                >
                  ❌ もう一度
                </button>
                <button
                  onClick={() => { saveLearnedStatus(currentCard.id, true); handleNext(); }}
                  className="px-5 py-2 bg-emerald-600 text-white text-xs font-bold rounded-xl hover:bg-emerald-700 shadow-sm"
                >
                  ⭕️ 覚えた！
                </button>
              </div>

              <button
                onClick={handleNext}
                className="px-4 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold hover:bg-slate-50"
              >
                次の論点 ▶
              </button>
            </div>
          </div>
        )}

        {/* 一覧リスト表示モード */}
        {viewMode === 'list' && (
          <div className="space-y-3">
            {filteredCards.map((c) => {
              const isLearned = learnedMap[c.id];
              return (
                <div key={c.id} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-3">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded font-bold text-[10px]">{c.subject}</span>
                      <span className="font-bold text-xs text-slate-900">{c.title}</span>
                    </div>
                    <button
                      onClick={() => saveLearnedStatus(c.id, !isLearned)}
                      className={`text-[10px] font-bold px-2 py-0.5 rounded border ${isLearned ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : 'bg-slate-100 text-slate-500 border-slate-200'}`}
                    >
                      {isLearned ? '✓ 習得済' : '未暗記'}
                    </button>
                  </div>

                  <p className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded font-serif">
                    <strong>【問題の所在】</strong> {c.issue}
                  </p>
                  <div className="text-xs bg-blue-50/50 p-3 rounded border border-blue-100 font-serif leading-relaxed text-slate-900">
                    <strong>【規範定立】</strong> {renderMaskedText(c.standardNorm, c.keyTerms)}
                  </div>
                </div>
              );
            })}
          </div>
        )}

      </div>
    </div>
  );
}
