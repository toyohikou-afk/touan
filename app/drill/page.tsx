'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

type DrillGuideItem = {
  subject: string;
  title: string;
  fatalMistakes: string[];
  logicFramework: string[];
  template: string;
};

const DRILL_SUBJECTS: Record<string, DrillGuideItem> = {
  '刑法': {
    subject: '刑法',
    title: '刑法：主犯先行・法的三段論法・共犯論の射程',
    fatalMistakes: [
      '従属的関与者（共犯）から先に検討する（原則主犯・実行正犯から検討すること）',
      '構成要件（実行行為・結果・因果関係・故意）の該当性検討の脱落',
      '共犯からの離脱において「物理的・心理的因果性の遮断」の規範・あてはめを抜かす',
      '不能犯、未遂、既遂の時期・客体の錯誤（法定的符合説）の認定漏れ'
    ],
    logicFramework: [
      '① 構成要件該当性（客観的構成要件 → 主観的構成要件［故意・不法領得意思］）',
      '② 違法性阻却事由（正当防衛36条1項：急迫不正の侵害・防衛の意思・相当性）',
      '③ 責任阻却事由（責任能力・期待可能性・違法性の錯誤）',
      '④ 共犯論（共同正犯60条：共謀・共謀に基づく実行・正犯性、因果的共犯論）'
    ],
    template: `第１ 甲の罪責\n１ 〇〇の行為について〇〇罪（刑法〇〇条）の成否を検討する。\n（１）構成要件該当性\n ア 規範：\n イ 当てはめ：\n（２）違法性・責任\n２ 共犯関係の検討（共謀・因果性の遮断等）\n\n第２ 乙の罪責\n１ ...`
  },
  '民法': {
    subject: '民法',
    title: '民法：要件事実・契約の成立から消滅・物権変動',
    fatalMistakes: [
      '請求の根拠（条文・訴訟物）を明示せずにいきなり信義則や一般論を展開する',
      '請求原因・抗弁・再抗弁の主張立証責任の分配を混同する',
      '対抗要件（177条）と無権利の法理（94条2項類推等）の峻別を誤る',
      '物上保証人の代位（501条）と後順位担保権者の関係を見落とす'
    ],
    logicFramework: [
      '① 請求の趣旨及び訴訟物の確定（所有権に基づく明渡、契約に基づく請求等）',
      '② 請求原因事実の充足性（法律要件に対応する具体的生事実の摘示）',
      '③ 被告の抗弁事由（売買・代物弁済482条・弁済・時効・解除等）',
      '④ 原告の再抗弁事由（取消・無効・第三者弁済の有効要件・停止条件等）'
    ],
    template: `第１ 設問１について\n１ 訴訟物及び請求の根拠\n２ 請求原因事実の検討\n\n第２ 設問２について\n１ 相手方の抗弁の成否（要件事実の検討）\n\n第３ 設問３について\n１ 再抗弁及び攻撃防御構造の帰結`
  },
  '憲法': {
    subject: '憲法',
    title: '憲法：三段階審査（保護範囲・制約・正当化）',
    fatalMistakes: [
      '原告の主張・被告の反論・私見の三段階構造を崩して単なる論述にする',
      '精神的自由（表現・集会）に対し安易に緩やかな合理性の基準を適用する',
      '「明白な危険」を客観的根拠なく感情的混乱で肯定する（敵意ある聴衆の法理の誤用）',
      '法令違憲（明確性・過度の広汎性）と適用違憲を区別せずに論じる'
    ],
    logicFramework: [
      '① 保護範囲（当該行為が憲法21条1項等のいかなる権利として保障されるか）',
      '② 制約の態様（直接的・事前的制約か、間接的・付随的制約か）',
      '③ 審査基準の定立（権利の重要性・制約態様の強度・パブリックフォーラム性）',
      '④ 目的・手段の審査（目的の重大性・手段の必要最小限性・より緩やかな規制手段）'
    ],
    template: `第１ 原告の主張（制約の重大性・厳格な審査基準の定立）\n１ 保障と制約\n２ 法令違憲の主張（明確性の原則・過度の広汎性）\n３ 適用違憲の主張（明白な危険の欠如）\n\n第２ 被告（行政側）の反論\n\n第３ 私見（合憲性判断）`
  },
  '行政法': {
    subject: '行政法',
    title: '行政法：処分性・原告適格・裁量審査・手続の瑕疵',
    fatalMistakes: [
      '処分性の要件（公権力性・国民の権利義務の直接具体的形成）の当てはめ不足',
      '原告適格（行訴法9条2項）で関係法令の趣旨・個別的保護利益の検討を飛ばす',
      '裁量統制において判断過程審査（事実誤認・考慮不尽・過大評価）を行わない',
      '仮の救済（執行停止・仮の義務付け）の重大な損害要件を看過する'
    ],
    logicFramework: [
      '① 訴訟要件の検討（処分性3条2項、原告適格9条1項・2項、訴えの利益）',
      '② 本案違法事由（根拠法令の要件該当性、法規適合性）',
      '③ 裁量権の逸脱濫用の審査（30条：事実誤認・他目的考慮・考慮不尽・比例原則違反）'
    ],
    template: `第１ 設問１（訴訟要件：処分性／原告適格）\n１ 規範定立：\n２ 本件への当てはめ：\n\n第２ 設問２（本案の違法性：裁量権の逸脱濫用）\n１ 裁量の有無及び範囲\n２ 判断過程の合理性（考慮不尽・事実誤認の検討）`
  },
  '商法': {
    subject: '商法',
    title: '商法・会社法：機関権限・新株発行・役員責任',
    fatalMistakes: [
      '取締役会決議と株主総会決議の権限分配の混同',
      '特別利害関係取締役（369条2項）の該当性と退席・定足数の検討漏れ',
      '確定した役員報酬（361条1項）の一方的減額における個別同意要件の看過',
      '新株発行無効の訴え（828条1項2号）における瑕疵の重大性と取引安全の衡量不足'
    ],
    logicFramework: [
      '① 意思決定手続の適法性（招集通知・定足数・議決要件）',
      '② 特別利害関係（忠実義務違反の蓋然性・個人の地位剥奪）',
      '③ 支配権移転新株発行（206条の2、主要目的ルール、通知送達の悪意）',
      '④ 訴訟手段の選択（新株発行無効の訴え、役員報酬差額請求等）'
    ],
    template: `第１ 設問１について\n１ 代表取締役解職決議の効力（会社法369条2項・特別利害関係）\n２ 役員報酬減額の有効性とAの請求（361条1項・具体的権利性）\n\n第２ 設問２について\n１ 新株発行無効の訴え（828条1項2号）の可否と無効事由`
  },
  '民事訴訟法': {
    subject: '民事訴訟法',
    title: '民訴法：訴訟物・自己利用文書・重複起訴・既判力',
    fatalMistakes: [
      '自己利用文書（220条4号ニ）を単に社外秘だからと結論付ける',
      '一部請求本訴係属中の反訴相殺における142条重複起訴の論証抜け',
      '既判力の客観的範囲（114条1項・2項）と争点効・信義則の混同',
      '処分権主義・弁論主義の第1・第2・第3テーゼの適用の誤り'
    ],
    logicFramework: [
      '① 訴訟物の特定と審判対象の画定（一部請求の許容性と残部請求）',
      '② 文書提出命令（220条4号ニ：作成目的・記載内容・開示不利益の総合考慮）',
      '③ 反訴と相殺の抗弁（重複起訴禁止142条、二重審理・既判力抵触のおそれ、予備的抗弁の構成）'
    ],
    template: `第１ 設問１について（自己利用文書の該当性）\n１ 民事訴訟法220条4号ニの解釈規範\n２ 本件予測表の該当性（Yの反論とXの立論）\n\n第２ 設問２について（反訴における相殺の抗弁）\n１ 本訴未請求部分（2億円）の適法性\n２ 本訴請求部分（1億円）の適法性（142条類推適用の要否）`
  },
  '刑事訴訟法': {
    subject: '刑事訴訟法',
    title: '刑訴法：強制処分・令状主義・伝聞法則・訴因変更',
    fatalMistakes: [
      '伝聞証拠（320条1項）の要証事実を誤って非伝聞を伝聞と判定する',
      '写真撮影報告書の電磁的記録の機械的正確性（原本性・同一性）の立証を抜かす',
      '訴因変更の限界（312条1項）で基本的事実関係の同一性の二段階基準を飛ばす',
      '客体の生死不明時における択一的認定と無罪推定（利益原則）の調和論証不足'
    ],
    logicFramework: [
      '① 捜査手続の適法性（任意捜査の限界・強制処分法定主義・令状主義）',
      '② 証拠能力（伝聞法則320条：公判外供述・要証事実・言語的行為、321条例外）',
      '③ 訴因変更（312条1項：公訴事実の同一性、日時・場所・行為態様の共通性）',
      '④ 判決（択一的認定の許容性・実質的重なり合い・軽い罪の限度での処断）'
    ],
    template: `第１ 設問１について（予備的訴因追加の可否）\n１ 公訴事実の同一性（312条1項）の判断基準\n２ 本件への当てはめ（基本的事実関係の共通性）\n\n第２ 設問２について（客体の生死不明と択一的認定）\n１ 無罪推定の原則（疑わしきは被告人の利益に）\n２ 構成要件の実質的重なり合いと軽い罪の認定`
  }
};

type FontSizeLevel = 'sm' | 'base' | 'lg' | 'xl';

const fontSizes: Record<FontSizeLevel, { text: string; lh: string; label: string }> = {
  sm: { text: '13px', lh: '1.6', label: '小' },
  base: { text: '15px', lh: '1.75', label: '標準' },
  lg: { text: '17px', lh: '1.85', label: '大' },
  xl: { text: '20px', lh: '1.95', label: '特大' },
};

export default function DrillPage() {
  const [selectedSubject, setSelectedSubject] = useState('刑法');
  const [userMemo, setUserMemo] = useState('');
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

  const current = DRILL_SUBJECTS[selectedSubject] || DRILL_SUBJECTS['刑法'];

  return (
    <div style={{ height: 'calc(100vh - 56px)', backgroundColor: '#f1f5f9', color: '#0f172a', display: 'flex', flexDirection: 'column', fontFamily: 'sans-serif', overflow: 'hidden' }}>
      
      {/* 48pxスリムヘッダー */}
      <header style={{ height: '48px', backgroundColor: '#ffffff', borderBottom: '1px solid #cbd5e1', padding: '0 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 1px 2px rgba(0,0,0,0.04)', flexShrink: 0 }}>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '18px' }}>⚡️</span>
          <span style={{ fontSize: '13px', fontWeight: '900', color: '#0f172a' }}>起案思考ドリル</span>

          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginLeft: '6px' }}>
            <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#64748b' }}>科目:</span>
            <select
              value={selectedSubject}
              onChange={(e) => {
                setSelectedSubject(e.target.value);
                setUserMemo('');
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
              {Object.keys(DRILL_SUBJECTS).map((sub) => (
                <option key={sub} value={sub}>{sub}</option>
              ))}
            </select>
          </div>
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

      {/* 2ペインメインエリア */}
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'minmax(420px, 48%) minmax(440px, 52%)', height: 'calc(100vh - 104px)', overflow: 'hidden' }}>
        
        {/* 左ペイン：即死地雷 ＆ 思考枠組み */}
        <section style={{ backgroundColor: '#ffffff', borderRight: '2px solid #cbd5e1', padding: '16px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '14px', fontSize: fontSizes[fontSize].text, lineHeight: fontSizes[fontSize].lh }}>
          
          <div style={{ backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '8px', padding: '12px' }}>
            <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#1e40af', marginBottom: '4px' }}>
              🎯 {current.title}
            </div>
            <p style={{ margin: 0, fontSize: '11px', color: '#3b82f6' }}>
              答案構成を開始する前の10分間で、出題趣旨の急所と思考ルートを整理します。
            </p>
          </div>

          <div style={{ backgroundColor: '#fff1f2', border: '1px solid #fecdd3', borderRadius: '8px', padding: '12px' }}>
            <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#9f1239', marginBottom: '6px' }}>
              🚨 考査委員の即死地雷（致命的減点項目）
            </div>
            <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '11px', color: '#881337', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {current.fatalMistakes.map((m, idx) => (
                <li key={idx}>{m}</li>
              ))}
            </ul>
          </div>

          <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px' }}>
            <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#334155', marginBottom: '6px' }}>
              📐 答案思考フレームワーク
            </div>
            <div style={{ fontSize: '11px', color: '#475569', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {current.logicFramework.map((fw, idx) => (
                <div key={idx} style={{ padding: '2px 0' }}>{fw}</div>
              ))}
            </div>
          </div>
        </section>

        {/* 右ペイン：思考プロセス・構成メモ作成欄 */}
        <section style={{ backgroundColor: '#f8fafc', display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
          <div style={{ height: '40px', padding: '0 16px', backgroundColor: '#ffffff', borderBottom: '1px solid #cbd5e1', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
            <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#334155' }}>✍️ 思考プロセス・構成アウトライン</span>
            <button
              type="button"
              onClick={() => setUserMemo(current.template)}
              style={{ fontSize: '10px', color: '#2563eb', border: '1px solid #bfdbfe', backgroundColor: '#eff6ff', padding: '2px 8px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
            >
              標準テンプレを挿入
            </button>
          </div>

          <div style={{ flex: 1, padding: '10px', boxSizing: 'border-box', display: 'flex' }}>
            <textarea
              value={userMemo}
              onChange={(e) => setUserMemo(e.target.value)}
              placeholder="ここに思考過程、争点整理、検討順序をメモしてください。"
              style={{
                width: '100%',
                height: '100%',
                border: '1px solid #cbd5e1',
                borderRadius: '8px',
                padding: '14px',
                fontSize: fontSizes[fontSize].text,
                lineHeight: fontSizes[fontSize].lh,
                fontFamily: 'serif',
                resize: 'none',
                outline: 'none',
                backgroundColor: '#ffffff',
                color: '#0f172a',
                boxSizing: 'border-box'
              }}
            />
          </div>
        </section>

      </div>

    </div>
  );
}
