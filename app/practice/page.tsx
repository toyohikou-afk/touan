'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

type DrillGuideItem = {
  title: string;
  fatalMistakes: string[];
  logicFramework: string[];
  template: string;
};

const SUBJECT_DRILL_GUIDES: Record<string, DrillGuideItem> = {
  '刑法': {
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
  },
  '民事実務': {
    title: '民事実務：要件事実・二段の推定・民事保全',
    fatalMistakes: [
      '訴訟物の個数・併合態様（単純併合・予備的併合）の記載漏れ',
      '二段の推定（民訴法228条4項）の1段目（事実上の推定）と2段目（法定推定）の混同',
      '代物弁済（482条）における登記完了・目的物引渡しの要件事実の誤記',
      '保全の必要性（民事保全法23条1項）の具体的保全事由（生前贈与・現状変更）の摘示不足'
    ],
    logicFramework: [
      '① 訴訟物・請求の趣旨・請求原因事実の完全摘示（よって書き不要）',
      '② 抗弁事実（代物弁済、債権譲渡通知467条1項）',
      '③ 二段の推定の構造と印影の盗用・冒用（間接事実：時価との乖離・印章保管・客観行動）',
      '④ 民事保全（占有移転禁止の仮処分・処分禁止の仮処分）'
    ],
    template: `第１ 設問１（訴訟物・請求の趣旨・請求原因・保全）\n１ 訴訟物（個数・併合態様）：\n２ 請求の趣旨：\n３ 請求原因事実：\n４ 民事保全命令及び保全の必要性：\n\n第２ 設問２（抗弁の要件事実：代物弁済）\n\n第３ 設問３（二段の推定と事実認定の展開）`
  },
  '刑事実務': {
    title: '刑事実務：故意・共謀の事実認定・証拠法・共犯の既遂時期',
    fatalMistakes: [
      '詐欺の故意で積極事実と消極事実を対比せずに単一方向のみ述べる',
      '客観的証拠（ICカード・領収書）による供述変遷・外堀固定のプロセスを看過する',
      '事件単位の原則に基づく起訴後余罪取調べ受忍義務否定の条文根拠欠落',
      '詐欺の既遂時期（受領時）と回収役の承継的共同正犯の先後関係の誤認'
    ],
    logicFramework: [
      '① 犯人性・客観的証拠（ICカード・領収書等による否認供述弾劾）',
      '② 故意の事実認定（積極事実 vs 消極事実）',
      '③ 取調べ受忍義務（余罪に対する勾留効力の不及び・起訴後当事者対立構造）',
      '④ 証拠法（スマホDM写真の非伝聞性・立証趣旨限定・原本性立証）',
      '⑤ 共犯の既遂時期と承継的共同正犯（既遂後の盗品等運搬罪256条2項）'
    ],
    template: `第１ 設問１（客観的証拠収集の捜査理由）\n\n第２ 設問２（詐欺の故意の事実認定：積極事実と消極事実の対比）\n１ 故意の内容（未必の故意）：\n２ 積極事実の摘示と評価：\n３ 消極事実の評価：\n４ 総合判断：\n\n第３ 設問３（余罪・起訴後取調べ受忍義務の否定）\n\n第４ 設問４（スマホ写真の証拠能力と立証活動）\n\n第５ 設問５（詐欺の既遂時期と承継的共同正犯の成否）`
  },
  '租税法': {
    title: '租税法：法人税所得計算・実質所得者課税・資産損失',
    fatalMistakes: [
      '法人税法22条の益金・損金の権利確定主義の検討抜け',
      '所得税法12条（実質所得者課税の原則）で法律的帰属説と経済的帰属説を対比しない',
      '倒壊危険建物の解体費用を誤って土地譲渡費用（33条3項）と断定する',
      '所得税法51条1項の資産損失の未償却残高計算（取得費−償却累計額）の誤算'
    ],
    logicFramework: [
      '① 法人税所得計算（22条：低廉購入の受贈益の有無、売上計上と権利確定）',
      '② 所得の人的帰属（所得税法12条：名義と実質的果実享受・支配管理）',
      '③ 必要経費（37条、51条4項：解体費用の不動産所得性）',
      '④ 資産損失（51条1項、施行令142条1号：簿価の損失算入と損益通算69条）'
    ],
    template: `第１ 設問１について（A社の法人税所得計算・法人税法22条）\n\n第２ 設問２について（所得の人的帰属・所得税法12条）\n１ 人的帰属の原則：\n２ Cの主張（法律的帰属説）：\n３ 税務署長の主張（経済的帰属・実質支配説）：\n\n第３ 設問３について（解体費用及び資産損失の計算）`
  },
  '経済法': {
    title: '経済法：不当な取引制限・意思の連絡・官製談合・競争の実質的制限',
    fatalMistakes: [
      '「一定の取引分野（市場画定）」の明示を飛ばしていきなり競争制限を論じる',
      '「意思の連絡」を契約書の存在と誤解する（暗黙の了解・同調認識で足りる）',
      '発注者関与（情報提示・納入調整）を理由に事業者の独禁法違反を免責する',
      '落札率99.7%などの具体的生事実を競争の実質的制限のあてはめで引用しない'
    ],
    logicFramework: [
      '① 主体要件（事業者2条1項）',
      '② 行為要件（共同して：意思の連絡、相互拘束・遂行）',
      '③ 一定の取引分野の画定（甲製品の調達入札市場）',
      '④ 競争の実質的制限（東宝スバル座判例：市場支配力の形成・維持）',
      '⑤ 公共の利益に反して（実質的違法性阻却事由の不存在）',
      '⑥ 発注者関与（官製談合）の評価と事業者の法的責任'
    ],
    template: `第１ ２社の行為と不当な取引制限（独占禁止法2条6項、3条後段）の成否\n１ 「事業者」該当性（2条1項）\n２ 「共同して」（意思の連絡の認定）\n３ 「相互にその事業活動を拘束」\n４ 「一定の取引分野における競争を実質的に制限」\n５ 発注者Aの関与（官製談合）と２社の責任`
  }
};

const MASTER_STATUTES = [
  { law: '憲法', num: '第21条', title: '表現の自由', text: '1 集会、結社及び言論、出版その他一切の表現の自由は、これを保障する。\n2 検閲は、これをしてはならない。通信の秘密は、これを侵してはならない。' },
  { law: '民法', num: '第482条', title: '代物弁済', text: '債務者が、債権者の承諾を得て、その負担した給付に代えて他の給付をしたときは、その給付は、弁済と同一の効力を有する。' },
  { law: '刑法', num: '第60条', title: '共同正犯', text: '二人以上共同して犯罪を実行した者は、すべて正犯とする。' },
  { law: '刑法', num: '第240条', title: '強盗致死傷', text: '強盗が、人を負傷させたときは無期又は六年以上の懲役に処し、死亡させたときは死刑又は無期懲役に処する。' },
  { law: '刑法', num: '第246条', title: '詐欺', text: '1 人を欺いて財物を交付させた者は、十年以下の懲役に処する。' },
  { law: '独占禁止法', num: '第2条第6項', title: '不当な取引制限の定義', text: '事業者が、他の事業者と共同して対価を決定し、維持し、若しくは引き上げ、又は数量、取引の相手方を制限する等相互にその事業活動を拘束し、若しくは遂行することにより、公共の利益に反して、一定の取引分野における競争を実質的に制限することをいう。' }
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
  statutes?: { law?: string; num?: string; title: string; text: string }[];
};

const DEFAULT_PROBLEMS: ProblemType[] = [
  {
    id: 'prob-1-co-principals-withdrawal',
    subject: '刑法',
    source_exam: '予備試験 論文式',
    target_issue: '共犯からの離脱・強盗致傷罪の共同正犯',
    time_limit_minutes: 70,
    fact_context: `【事実】
1. 甲は、乙と共に、夜間に一人暮らしの高齢女性V（75歳）方に押し入り、現金を強取することを計画した。
2. 計画当日、甲と乙はV方付近に赴き、甲はあらかじめ用意していた金属製バール（長さ約60センチメートル）及び粘着テープを乙に手渡した。甲の担当は見張りおよび逃走用車両の運転であり、乙の担当はV方に侵入して現金を奪うことであった。
3. 乙がバールを用いてV方の勝手口の施錠を破壊し、屋内に侵入しようとした直前、甲は急に罪悪感を覚え、「おい乙、やっぱりこんな危険なことはやめよう。引き返そう」と言って乙の肩を掴んだ。
4. しかし、乙は甲の手を激しく振り払い、「ここまで来てやめられるか！お前が逃げても俺は一人でやる」と言い放ち、そのまま屋内に侵入した。
5. 甲はその場に留まることなく、用意していた車両に乗って一人で現場を立ち去った。
6. 乙は屋内で物色中、目を覚ましたVに見つかったため、持っていたバールでVの頭部を強打して全治3週間の傷害を負わせ、現金100万円を強取して逃走した。

【設問】
甲の罪責を論ぜよ（建造物侵入罪の成否を除く）。`,
    standard_norm: '共犯関係からの離脱が認められるためには、離脱の意思表示と相手方の了承、または当初の共謀に基づく因果性の遮断（物理的・心理的因果性の除去）が必要である。凶器を提供した場合は、その回収等積極的除去が不可欠。',
    key_facts: [
      '甲が主導的に計画を立て、凶器（バール）と粘着テープを乙に提供したこと',
      '着手直前に甲が離脱を申し出たが乙は拒絶して実行を継続したこと',
      '甲が提供したバールが実際に強盗および暴行（傷害結果）に使用されたこと',
      '甲が現場を立ち去ったのみで乙の犯行を積極的に制止しなかったこと'
    ],
    statutes: [
      { law: '刑法', num: '第60条', title: '共同正犯', text: '二人以上共同して犯罪を実行した者は、すべて正犯とする。' },
      { law: '刑法', num: '第240条', title: '強盗致死傷', text: '強盗が、人を負傷させたときは無期又は六年以上の懲役に処し、死亡させたときは死刑又は無期懲役に処する。' }
    ]
  }
];

type FontSizeLevel = 'sm' | 'base' | 'lg' | 'xl';

const fontSizes: Record<FontSizeLevel, { text: string; lh: string; label: string }> = {
  sm: { text: '13px', lh: '1.6', label: '小' },
  base: { text: '15px', lh: '1.75', label: '標準' },
  lg: { text: '17px', lh: '1.85', label: '大' },
  xl: { text: '20px', lh: '1.95', label: '特大' },
};

const SUBJECT_ORDER = [
  '憲法', '行政法', '民法', '商法', '民事訴訟法', '刑法', '刑事訴訟法',
  '民事実務', '刑事実務', '租税法', '経済法'
];

export default function PracticePage() {
  const [adminQuery, setAdminQuery] = useState('');
  const [problems, setProblems] = useState<ProblemType[]>(DEFAULT_PROBLEMS);
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState<string>('ALL');
  const [selectedProblemId, setSelectedProblemId] = useState<string>(DEFAULT_PROBLEMS[0].id);

  // 新規問題追加モーダル用のステート
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newSubject, setNewSubject] = useState('刑法');
  const [newTitle, setNewTitle] = useState('');
  const [newFact, setNewFact] = useState('');
  const [newNorm, setNewNorm] = useState('');
  const [isSubmittingNewProblem, setIsSubmittingNewProblem] = useState(false);

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
    return problems.filter((p) => p.subject === selectedSubjectFilter);
  }, [problems, selectedSubjectFilter]);

  const currentProblem = problems.find((p) => p.id === selectedProblemId) || filteredProblems[0] || DEFAULT_PROBLEMS[0];

  const [userDraft, setUserDraft] = useState('');
  const [drillNotes, setDrillNotes] = useState('');
  const [activeTab, setActiveTab] = useState<'problem' | 'drill' | 'statute'>('problem');
  const [fontSize, setFontSize] = useState<FontSizeLevel>('base');
  
  const [secondsLeft, setSecondsLeft] = useState(70 * 60);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [aiFeedback, setAiFeedback] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<'synced' | 'saving' | 'offline'>('synced');

  const [statuteSearchQuery, setStatuteSearchQuery] = useState('');
  const [statuteLawFilter, setStatuteLawFilter] = useState('ALL');

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const admin = params.get('admin');
      if (admin) setAdminQuery(`?admin=${encodeURIComponent(admin)}`);
    }
    loadProblemsFromSupabase();
  }, []);

  const loadProblemsFromSupabase = async () => {
    try {
      const { data, error } = await supabase.from('problems').select('*').order('created_at', { ascending: false });
      if (!error && data && data.length > 0) {
        // 問題文が空や「刑法 第5問」の残骸を除外
        const validData = data.filter((d: ProblemType) => d.target_issue !== '刑法 第5問' && d.id !== 'a1111111-1111-1111-1111-111111111111');
        const normalizedData = validData.map((d: ProblemType) => ({ ...d, time_limit_minutes: 70 }));
        const merged = [...normalizedData, ...DEFAULT_PROBLEMS.filter(dp => !normalizedData.some(d => d.id === dp.id))];
        setProblems(merged);
        setSelectedProblemId(merged[0].id);
        loadDraftFromCloud(merged[0].id);
      } else {
        setProblems(DEFAULT_PROBLEMS);
        loadDraftFromCloud(DEFAULT_PROBLEMS[0].id);
      }
    } catch (e) {
      console.warn('Supabase問題ロードスキップ:', e);
      loadDraftFromCloud(DEFAULT_PROBLEMS[0].id);
    }
  };

  const loadDraftFromCloud = async (probId: string) => {
    try {
      const { data } = await supabase.from('practice_drafts').select('*').eq('problem_id', probId).single();
      if (data) {
        if (data.user_draft) setUserDraft(data.user_draft);
        if (data.drill_notes) setDrillNotes(data.drill_notes);
        if (data.seconds_left && data.seconds_left > 0) setSecondsLeft(data.seconds_left);
      }
    } catch (e) {
      console.warn('下書き復元スキップ:', e);
    }
  };

  const triggerAutoSave = (draft: string, notes: string, sec: number) => {
    setSyncStatus('saving');
    if (autoSaveTimeoutRef.current) clearTimeout(autoSaveTimeoutRef.current);
    autoSaveTimeoutRef.current = setTimeout(async () => {
      try {
        await supabase.from('practice_drafts').upsert({
          problem_id: currentProblem.id,
          user_draft: draft,
          drill_notes: notes,
          seconds_left: sec,
          updated_at: new Date().toISOString()
        });
        setSyncStatus('synced');
      } catch (err) {
        setSyncStatus('offline');
      }
    }, 1500);
  };

  const handleDraftChange = (text: string) => {
    setUserDraft(text);
    triggerAutoSave(text, drillNotes, secondsLeft);
  };

  const handleDrillNotesChange = (text: string) => {
    setDrillNotes(text);
    triggerAutoSave(userDraft, text, secondsLeft);
  };

  const handleInsertDrillToDraft = () => {
    const drill = SUBJECT_DRILL_GUIDES[currentProblem.subject] || SUBJECT_DRILL_GUIDES['刑法'];
    const insertText = drillNotes.trim() ? drillNotes : drill.template;
    if (userDraft.trim() && !window.confirm('答案欄の末尾にドリルの構成メモを挿入しますか？')) {
      return;
    }
    const newDraft = userDraft ? `${userDraft}\n\n${insertText}` : insertText;
    handleDraftChange(newDraft);
    alert('ドリルの構成メモを答案作成欄に反映しました！');
  };

  const handleSubjectChange = (newSubject: string) => {
    if (newSubject === selectedSubjectFilter) return;
    setSelectedSubjectFilter(newSubject);
    const targetList = newSubject === 'ALL' ? problems : problems.filter((p) => p.subject === newSubject);
    const nextProb = targetList[0] || DEFAULT_PROBLEMS[0];
    switchProblem(nextProb.id);
  };

  const handleProblemChange = (newProblemId: string) => {
    if (newProblemId === selectedProblemId) return;
    switchProblem(newProblemId);
  };

  const switchProblem = (targetId: string) => {
    setSelectedProblemId(targetId);
    setUserDraft('');
    setDrillNotes('');
    setAiFeedback(null);
    setSecondsLeft(70 * 60);
    setIsTimerRunning(false);
    setActiveTab('problem');
    loadDraftFromCloud(targetId);
  };

  // ★ 新規問題の登録処理
  const handleCreateNewProblem = async () => {
    if (!newTitle.trim() || !newFact.trim()) {
      alert('論点名（タイトル）と問題文（事実・設問）を入力してください。');
      return;
    }
    setIsSubmittingNewProblem(true);
    try {
      const newId = `prob-${Date.now()}`;
      const newProblemData = {
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
      
      await loadProblemsFromSupabase();
      switchProblem(newId);
    } catch (e: unknown) {
      alert(`問題登録エラー: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setIsSubmittingNewProblem(false);
    }
  };

  // ★ 現在の問題の削除処理
  const handleDeleteCurrentProblem = async () => {
    if (problems.length <= 1) {
      alert('これ以上問題を削除できません。最低1問は保持する必要があります。');
      return;
    }

    const isConfirmed = window.confirm(
      `現在表示中の問題「[${currentProblem.subject}] ${currentProblem.target_issue}」を削除しますか？\n※この操作は取り消せません。`
    );
    if (!isConfirmed) return;

    try {
      const { error } = await supabase.from('problems').delete().eq('id', currentProblem.id);
      if (error) throw error;

      alert('問題を削除しました。');
      const remaining = problems.filter((p) => p.id !== currentProblem.id);
      setProblems(remaining);
      const nextProb = remaining[0] || DEFAULT_PROBLEMS[0];
      switchProblem(nextProb.id);
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
          if (nextSec % 30 === 0) triggerAutoSave(userDraft, drillNotes, nextSec);
          return nextSec;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isTimerRunning, secondsLeft, userDraft, drillNotes]);

  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleSubmitEvaluation = async () => {
    if (!userDraft.trim()) {
      alert('答案本文が空です。起案を入力してください。');
      return;
    }

    if (!confirm('答案を提出し、Gemini AIによる考査委員基準採点（答案構成チェック・即死地雷判定を含む）を実行しますか？')) {
      return;
    }

    setIsEvaluating(true);
    setAiFeedback(null);
    const timeSpent = 70 * 60 - secondsLeft;

    try {
      const res = await fetch('/api/evaluate-draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
      setAiFeedback(feedback);

      await supabase.from('submissions').insert([
        {
          problem_id: currentProblem.id,
          user_draft: userDraft,
          time_spent_seconds: timeSpent,
          ai_feedback: feedback,
        },
      ]);
    } catch (err: unknown) {
      alert(`採点エラー: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsEvaluating(false);
    }
  };

  const currentDrill = SUBJECT_DRILL_GUIDES[currentProblem.subject] || SUBJECT_DRILL_GUIDES['刑法'];

  return (
    <div style={{ height: 'calc(100vh - 56px)', backgroundColor: '#f1f5f9', color: '#0f172a', display: 'flex', flexDirection: 'column', fontFamily: 'sans-serif', overflow: 'hidden' }}>
      
      {/* 起案ヘッダー */}
      <header style={{ height: '48px', backgroundColor: '#ffffff', borderBottom: '1px solid #cbd5e1', padding: '0 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 1px 2px rgba(0,0,0,0.04)', flexShrink: 0 }}>
        
        {/* 左側：科目選択 ＆ 問題選択 ＆ 保存状態 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '18px' }}>⚖️</span>

          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#64748b' }}>科目:</span>
            <select
              value={selectedSubjectFilter}
              onChange={(e) => handleSubjectChange(e.target.value)}
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
              <option value="ALL">全科目 ({problems.length})</option>
              {availableSubjects.map((sub) => (
                <option key={sub} value={sub}>{sub}</option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#64748b' }}>問題:</span>
            <select
              value={selectedProblemId}
              onChange={(e) => handleProblemChange(e.target.value)}
              style={{
                fontSize: '12px',
                fontWeight: 'bold',
                padding: '3px 8px',
                borderRadius: '6px',
                border: '1px solid #94a3b8',
                backgroundColor: '#ffffff',
                color: '#0f172a',
                cursor: 'pointer',
                outline: 'none',
                maxWidth: '260px'
              }}
            >
              {filteredProblems.map((p) => (
                <option key={p.id} value={p.id}>
                  [{p.subject}] {p.target_issue}
                </option>
              ))}
            </select>
          </div>

          <span style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '4px', backgroundColor: syncStatus === 'synced' ? '#dcfce7' : syncStatus === 'saving' ? '#fef9c3' : '#fee2e2', color: syncStatus === 'synced' ? '#166534' : syncStatus === 'saving' ? '#854d0e' : '#991b1b', fontWeight: 'bold' }}>
            {syncStatus === 'synced' ? '☁️ 保存済' : '⏳ 保存中'}
          </span>
        </div>

        {/* 右側：文字サイズ ＆ 70分タイマー ＆ 答案履歴リンク */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', backgroundColor: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '2px 4px', gap: '2px' }}>
            <span style={{ fontSize: '10px', fontWeight: 'bold', color: '#475569', marginRight: '3px' }}>🔍</span>
            {(['sm', 'base', 'lg', 'xl'] as FontSizeLevel[]).map((level) => (
              <button
                key={level}
                type="button"
                onClick={() => setFontSize(level)}
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

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: '#f8fafc', border: '1px solid #cbd5e1', padding: '2px 8px', borderRadius: '6px' }}>
            <span style={{ fontSize: '13px', fontWeight: 'bold', fontFamily: 'monospace', color: secondsLeft < 600 ? '#dc2626' : '#0f172a' }}>
              ⏱ {formatTimer(secondsLeft)}
            </span>
            <button
              type="button"
              onClick={() => setIsTimerRunning(!isTimerRunning)}
              style={{
                fontSize: '10px',
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
            href={`/dashboard${adminQuery}`}
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
            📊 答案履歴
          </Link>
        </div>
      </header>

      {/* 2ペインメイン作業エリア */}
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'minmax(420px, 48%) minmax(440px, 52%)', height: 'calc(100vh - 104px)', overflow: 'hidden' }}>
        
        {/* 左ペイン */}
        <section style={{ backgroundColor: '#ffffff', borderRight: '2px solid #cbd5e1', display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
          
          {/* ★ タブバー（右端に「＋ 新規問題」「🗑️ 問題削除」を常時固定配置） */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #e2e8f0', backgroundColor: '#f8fafc', padding: '0 8px', flexShrink: 0 }}>
            <div style={{ display: 'flex' }}>
              <button
                type="button"
                onClick={() => setActiveTab('problem')}
                style={{
                  padding: '10px 14px',
                  fontSize: '12px',
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
                onClick={() => setActiveTab('drill')}
                style={{
                  padding: '10px 14px',
                  fontSize: '12px',
                  fontWeight: 'bold',
                  border: 'none',
                  background: 'none',
                  cursor: 'pointer',
                  borderBottom: activeTab === 'drill' ? '3px solid #2563eb' : '3px solid transparent',
                  color: activeTab === 'drill' ? '#2563eb' : '#64748b',
                }}
              >
                📝 全科目起案ドリル・構成
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('statute')}
                style={{
                  padding: '10px 14px',
                  fontSize: '12px',
                  fontWeight: 'bold',
                  border: 'none',
                  background: 'none',
                  cursor: 'pointer',
                  borderBottom: activeTab === 'statute' ? '3px solid #0284c7' : '3px solid transparent',
                  color: activeTab === 'statute' ? '#0284c7' : '#64748b',
                }}
              >
                📖 電子六法
              </button>
            </div>

            {/* ★ ここに確実に常時表示されるボタンを配置 */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(true)}
                style={{
                  padding: '4px 10px',
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
                  gap: '2px'
                }}
              >
                ＋ 新規問題
              </button>
              <button
                type="button"
                onClick={handleDeleteCurrentProblem}
                style={{
                  padding: '4px 8px',
                  backgroundColor: '#fff1f2',
                  border: '1px solid #fecdd3',
                  color: '#be123c',
                  fontSize: '11px',
                  fontWeight: 'bold',
                  borderRadius: '6px',
                  cursor: 'pointer'
                }}
                title="現在選択中の問題を削除"
              >
                🗑️ 削除
              </button>
            </div>
          </div>

          <div style={{ flex: 1, padding: '16px', overflowY: 'auto', fontSize: fontSizes[fontSize].text, lineHeight: fontSizes[fontSize].lh }}>
            {activeTab === 'problem' && (
              <div style={{ whiteSpace: 'pre-wrap', fontFamily: 'serif', color: '#1e293b' }}>
                {currentProblem.fact_context}
              </div>
            )}

            {activeTab === 'drill' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '8px', padding: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#1e40af' }}>
                      ⚡️ {currentDrill.title}
                    </span>
                    <button
                      type="button"
                      onClick={handleInsertDrillToDraft}
                      style={{
                        padding: '4px 10px',
                        backgroundColor: '#2563eb',
                        color: '#ffffff',
                        fontSize: '11px',
                        fontWeight: 'bold',
                        borderRadius: '6px',
                        border: 'none',
                        cursor: 'pointer',
                      }}
                    >
                      👉 答案欄に骨子を転送
                    </button>
                  </div>
                  <p style={{ margin: 0, fontSize: '11px', color: '#3b82f6' }}>
                    起案前の10分で即死地雷をチェックし、骨子を整理します。構成メモは答案提出時にAI講評で自動チェック・補完されます。
                  </p>
                </div>

                <div style={{ backgroundColor: '#fff1f2', border: '1px solid #fecdd3', borderRadius: '8px', padding: '12px' }}>
                  <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#9f1239', marginBottom: '6px' }}>
                    🚨 考査委員の即死地雷（致命的減点項目）
                  </div>
                  <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '11px', color: '#881337', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {currentDrill.fatalMistakes.map((mistake, idx) => (
                      <li key={idx}>{mistake}</li>
                    ))}
                  </ul>
                </div>

                <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px' }}>
                  <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#334155', marginBottom: '6px' }}>
                    📐 答案思考フレームワーク
                  </div>
                  <div style={{ fontSize: '11px', color: '#475569', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {currentDrill.logicFramework.map((fw, idx) => (
                      <div key={idx} style={{ padding: '2px 0' }}>{fw}</div>
                    ))}
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#0f172a' }}>
                      ✍️ 答案構成・メモ欄（クラウド自動保存中）
                    </span>
                    <button
                      type="button"
                      onClick={() => handleDrillNotesChange(currentDrill.template)}
                      style={{ fontSize: '10px', color: '#2563eb', border: '1px solid #bfdbfe', backgroundColor: '#eff6ff', padding: '1px 6px', borderRadius: '4px', cursor: 'pointer' }}
                    >
                      標準テンプレを挿入
                    </button>
                  </div>
                  <textarea
                    value={drillNotes}
                    onChange={(e) => handleDrillNotesChange(e.target.value)}
                    placeholder="ここに論点メモ、拾うべき生事実、構成順序をメモしてください。&#10;※この内容は答案提出時にAI講評によって「思考フレームワーク・即死地雷」が自動判定・補完されます。"
                    style={{
                      width: '100%',
                      height: '200px',
                      padding: '10px',
                      fontSize: '12px',
                      fontFamily: 'monospace',
                      border: '1px solid #cbd5e1',
                      borderRadius: '6px',
                      outline: 'none',
                      backgroundColor: '#ffffff',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
              </div>
            )}

            {activeTab === 'statute' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ backgroundColor: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <input
                    type="text"
                    placeholder="条文番号または語句 (例: 21, 246, 2条6項, 392, 142)"
                    value={statuteSearchQuery}
                    onChange={(e) => setStatuteSearchQuery(e.target.value)}
                    style={{ width: '100%', padding: '6px 10px', fontSize: '12px', border: '1px solid #94a3b8', borderRadius: '6px', outline: 'none' }}
                  />
                  <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                    {['ALL', '憲法', '行政法', '民法', '商法', '刑法', '刑事訴訟法', '民事訴訟法', '独占禁止法'].map((law) => (
                      <button
                        key={law}
                        type="button"
                        onClick={() => setStatuteLawFilter(law)}
                        style={{
                          padding: '2px 8px',
                          fontSize: '10px',
                          fontWeight: 'bold',
                          borderRadius: '4px',
                          border: statuteLawFilter === law ? '1px solid #0284c7' : '1px solid #cbd5e1',
                          backgroundColor: statuteLawFilter === law ? '#0284c7' : '#ffffff',
                          color: statuteLawFilter === law ? '#ffffff' : '#475569',
                          cursor: 'pointer',
                        }}
                      >
                        {law}
                      </button>
                    ))}
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {(() => {
                    const combined = [...(currentProblem.statutes || []).map(s => ({ law: s.law || currentProblem.subject, num: s.num || '', title: s.title, text: s.text })), ...MASTER_STATUTES];
                    const q = statuteSearchQuery.trim().toLowerCase();
                    const filtered = combined.filter(item => {
                      const matchLaw = statuteLawFilter === 'ALL' || item.law.includes(statuteLawFilter);
                      if (!q) return matchLaw;
                      return matchLaw && ((item.text || '').toLowerCase().includes(q) || (item.title || '').toLowerCase().includes(q) || (item.num || '').toLowerCase().includes(q));
                    });

                    return filtered.map((st, idx) => (
                      <div key={idx} style={{ backgroundColor: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '10px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                          <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#0f172a' }}>
                            {st.law} {st.num} {st.title}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(`【${st.law} ${st.num} ${st.title}】\n${st.text}\n`);
                              alert(`${st.title} をコピーしました`);
                            }}
                            style={{ fontSize: '10px', color: '#0284c7', border: '1px solid #bae6fd', backgroundColor: '#ffffff', padding: '2px 6px', borderRadius: '4px', cursor: 'pointer' }}
                          >
                            📋 引用コピー
                          </button>
                        </div>
                        <p style={{ margin: 0, fontSize: '11px', lineHeight: '1.6', color: '#334155', whiteSpace: 'pre-wrap', fontFamily: 'serif' }}>
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

        {/* 右ペイン */}
        <section style={{ backgroundColor: '#f8fafc', display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
          <div style={{ height: '40px', padding: '0 16px', backgroundColor: '#ffffff', borderBottom: '1px solid #cbd5e1', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#334155' }}>✍️ 答案作成欄</span>
              <span style={{ fontSize: '11px', color: '#64748b' }}>
                文字数: <strong style={{ color: '#0f172a' }}>{userDraft.length}</strong> 字（約 {(userDraft.length / 690).toFixed(1)} 頁）
              </span>
            </div>

            <button
              type="button"
              onClick={handleSubmitEvaluation}
              disabled={isEvaluating}
              style={{
                backgroundColor: isEvaluating ? '#94a3b8' : '#2563eb',
                color: '#ffffff',
                padding: '4px 12px',
                borderRadius: '6px',
                fontSize: '11px',
                fontWeight: 'bold',
                border: 'none',
                cursor: isEvaluating ? 'not-allowed' : 'pointer',
              }}
            >
              {isEvaluating ? '⏳ 考査委員が採点・講評中...' : '🚀 答案提出・AI厳格採点（構成補完）'}
            </button>
          </div>

          <div style={{ flex: aiFeedback ? '0 0 45%' : '1', padding: '10px', boxSizing: 'border-box', display: 'flex', overflow: 'hidden' }}>
            <textarea
              ref={textareaRef}
              value={userDraft}
              onChange={(e) => handleDraftChange(e.target.value)}
              placeholder={`【${currentProblem.target_issue}】の答案を作成してください。`}
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
                boxSizing: 'border-box',
              }}
            />
          </div>

          {aiFeedback && (
            <div style={{ flex: '1', borderTop: '2px solid #cbd5e1', backgroundColor: '#fffdf5', padding: '14px', overflowY: 'auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#854d0e' }}>
                  ⚖️ 考査委員採点講評（答案構成チェック・即死地雷判定を含む）
                </span>
                <button
                  type="button"
                  onClick={() => setAiFeedback(null)}
                  style={{ fontSize: '10px', color: '#854d0e', border: '1px solid #fde047', backgroundColor: '#fef9c3', padding: '1px 6px', borderRadius: '4px', cursor: 'pointer' }}
                >
                  閉じる
                </button>
              </div>
              <div style={{ fontSize: fontSizes[fontSize].text, lineHeight: fontSizes[fontSize].lh, color: '#1e293b', whiteSpace: 'pre-wrap' }}>
                {aiFeedback}
              </div>
            </div>
          )}
        </section>

      </div>

      {/* ★ 新規問題追加モーダル */}
      {isAddModalOpen && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15,23,42,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 100, padding: '16px' }}>
          <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', maxWidth: '640px', width: '100%', maxHeight: '90vh', overflowY: 'auto', padding: '24px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '900', color: '#0f172a', margin: 0 }}>
                ➕ 新しい演習問題を追加登録
              </h3>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', color: '#64748b' }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', gap: '12px' }}>
                <div style={{ flex: '0 0 140px' }}>
                  <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#475569', display: 'block', marginBottom: '4px' }}>科目</label>
                  <select
                    value={newSubject}
                    onChange={(e) => setNewSubject(e.target.value)}
                    style={{ width: '100%', padding: '8px', fontSize: '12px', border: '1px solid #cbd5e1', borderRadius: '6px', outline: 'none' }}
                  >
                    {SUBJECT_ORDER.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>

                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#475569', display: 'block', marginBottom: '4px' }}>論点名・問題タイトル *</label>
                  <input
                    type="text"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="例: 不動産二重譲渡と横領・客体の錯誤"
                    style={{ width: '100%', padding: '8px', fontSize: '12px', border: '1px solid #cbd5e1', borderRadius: '6px', outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#475569', display: 'block', marginBottom: '4px' }}>問題文（事実・設問） *</label>
                <textarea
                  value={newFact}
                  onChange={(e) => setNewFact(e.target.value)}
                  placeholder="【事実】&#10;1. 甲は...&#10;&#10;【設問】&#10;甲の罪責を論ぜよ。"
                  style={{ width: '100%', height: '180px', padding: '10px', fontSize: '12px', fontFamily: 'serif', border: '1px solid #cbd5e1', borderRadius: '6px', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#475569', display: 'block', marginBottom: '4px' }}>出題趣旨・判例の規範定立（任意）</label>
                <textarea
                  value={newNorm}
                  onChange={(e) => setNewNorm(e.target.value)}
                  placeholder="AI採点時に参照する判例規範や当てはめ基準があれば入力してください。"
                  style={{ width: '100%', height: '80px', padding: '8px', fontSize: '11px', border: '1px solid #cbd5e1', borderRadius: '6px', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', borderTop: '1px solid #e2e8f0', paddingTop: '12px' }}>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                style={{ padding: '6px 14px', backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}
              >
                キャンセル
              </button>
              <button
                type="button"
                onClick={handleCreateNewProblem}
                disabled={isSubmittingNewProblem}
                style={{ padding: '6px 18px', backgroundColor: '#059669', color: '#ffffff', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold', cursor: isSubmittingNewProblem ? 'not-allowed' : 'pointer' }}
              >
                {isSubmittingNewProblem ? '保存中...' : '登録して起案を開始'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
