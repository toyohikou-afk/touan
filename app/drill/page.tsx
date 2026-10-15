'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

// 全科目対応：考査委員の即死地雷 ＆ 答案思考フレームワーク
const SUBJECT_DRILL_DATA: Record<string, { title: string; fatalMistakes: string[]; logicFramework: string[]; defaultTemplate: string }> = {
  '刑法': {
    title: '刑法：主犯先行・法的三段論法・共犯の射程',
    fatalMistakes: [
      '従属的関与者（共犯）から先に検討する（原則主犯・実行正犯から検討すること）',
      '構成要件該当性（客観的要件→故意・不法領得意思）の検討の脱落',
      '共犯の離脱で「因果性の遮断（物理的・心理的影響の除去）」の規範・当てはめを抜かす',
      '客体の錯誤（法定的符合説）や既遂時期の認定漏れ'
    ],
    logicFramework: [
      '① 構成要件該当性（実行行為 → 結果 → 因果関係 → 故意・不法領得意思）',
      '② 違法性阻却事由（正当防衛36条1項：急迫不正の侵害・防衛の意思・相当性）',
      '③ 責任阻却事由（責任能力・期待可能性・違法性の錯誤）',
      '④ 共犯論（共同正犯60条：共謀・共謀に基づく実行・正犯性、因果的共犯論）'
    ],
    defaultTemplate: `第１ 甲の罪責\n１ 〇〇の行為について〇〇罪（刑法〇〇条）の成否\n（１）構成要件該当性\n ア 規範：\n イ 当てはめ：\n（２）違法性・責任\n２ 共犯関係の検討（共謀・因果性の遮断等）\n\n第２ 乙の罪責\n１ ...`
  },
  '民法': {
    title: '民法：要件事実・契約の成立から消滅・物権変動',
    fatalMistakes: [
      '請求の根拠（条文・訴訟物）を明示せずに信義則や一般論を展開する',
      '請求原因・抗弁・再抗弁の主張立証責任の分配を混同する',
      '対抗要件（177条）と無権利の法理（94条2項類推等）の峻別を誤る',
      '物上保証人の代位（501条）と後順位担保権者の関係を見落とす'
    ],
    logicFramework: [
      '① 請求の趣旨及び訴訟物の確定（所有権に基づく明渡請求、契約に基づく請求等）',
      '② 請求原因事実の充足性（法律要件に対応する具体的生事実の摘示）',
      '③ 被告の抗弁事由（売買・代物弁済482条・弁済・時効・解除等）',
      '④ 原告の再抗弁事由（取消・無効・第三者弁済の有効要件・停止条件等）'
    ],
    defaultTemplate: `第１ 設問１について\n１ 訴訟物及び請求の根拠\n２ 請求原因事実の検討\n\n第２ 設問２について\n１ 相手方の抗弁の成否（要件事実の検討）\n\n第３ 設問３について\n１ 再抗弁及び攻撃防御構造の帰結`
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
    defaultTemplate: `第１ 原告の主張（制約の重大性・厳格な審査基準の定立）\n１ 保障と制約\n２ 法令違憲の主張（明確性の原則・過度の広汎性）\n３ 適用違憲の主張（明白な危険の欠如）\n\n第２ 被告（行政側）の反論\n\n第３ 私見（合憲性判断）`
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
    defaultTemplate: `第１ 設問１（訴訟要件：処分性／原告適格）\n１ 規範定立：\n２ 本件への当てはめ：\n\n第２ 設問２（本案の違法性：裁量権の逸脱濫用）\n１ 裁量の有無及び範囲\n２ 判断過程の合理性（考慮不尽・事実誤認の検討）`
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
    defaultTemplate: `第１ 設問１について\n１ 代表取締役解職決議の効力（会社法369条2項・特別利害関係）\n２ 役員報酬減額の有効性とAの請求（361条1項・具体的権利性）\n\n第２ 設問２について\n１ 新株発行無効の訴え（828条1項2号）の可否と無効事由`
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
    defaultTemplate: `第１ 設問１について（自己利用文書の該当性）\n１ 民事訴訟法220条4号ニの解釈規範\n２ 本件予測表の該当性（Yの反論とXの立論）\n\n第２ 設問２について（反訴における相殺の抗弁）\n１ 本訴未請求部分（2億円）の適法性\n２ 本訴請求部分（1億円）の適法性（142条類推適用の要否）`
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
    defaultTemplate: `第１ 設問１について（予備的訴因追加の可否）\n１ 公訴事実の同一性（312条1項）の判断基準\n２ 本件への当てはめ（基本的事実関係の共通性）\n\n第２ 設問２について（客体の生死不明と択一的認定）\n１ 無罪推定の原則（疑わしきは被告人の利益に）\n２ 構成要件の実質的重なり合いと軽い罪の認定`
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
    defaultTemplate: `第１ 設問１（訴訟物・請求の趣旨・請求原因・保全）\n１ 訴訟物（個数・併合態様）：\n２ 請求の趣旨：\n３ 請求原因事実：\n４ 民事保全命令及び保全の必要性：\n\n第２ 設問２（抗弁の要件事実：代物弁済）\n\n第３ 設問３（二段の推定と事実認定の展開）`
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
    defaultTemplate: `第１ 設問１（客観的証拠収集の捜査理由）\n\n第２ 設問２（詐欺の故意の事実認定：積極事実と消極事実の対比）\n１ 故意の内容（未必の故意）：\n２ 積極事実の摘示と評価：\n３ 消極事実の評価：\n４ 総合判断：\n\n第３ 設問３（余罪・起訴後取調べ受忍義務の否定）\n\n第４ 設問４（スマホ写真の証拠能力と立証活動）\n\n第５ 設問５（詐欺の既遂時期と承継的共同正犯の成否）`
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
    defaultTemplate: `第１ 設問１について（A社の法人税所得計算・法人税法22条）\n\n第２ 設問２について（所得の人的帰属・所得税法12条）\n１ 人的帰属の原則：\n２ Cの主張（法律的帰属説）：\n３ 税務署長の主張（経済的帰属・実質支配説）：\n\n第３ 設問３について（解体費用及び資産損失の計算）`
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
    defaultTemplate: `第１ ２社の行為と不当な取引制限（独占禁止法2条6項、3条後段）の成否\n１ 「事業者」該当性（2条1項）\n２ 「共同して」（意思の連絡の認定）\n３ 「相互にその事業活動を拘束」\n４ 「一定の取引分野における競争を実質的に制限」\n５ 発注者Aの関与（官製談合）と２社の責任`
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

type FontSizeLevel = 'sm' | 'base' | 'lg' | 'xl';

const fontSizes: Record<FontSizeLevel, { text: string; lh: string; label: string }> = {
  sm: { text: '13px', lh: '1.6', label: '小' },
  base: { text: '15px', lh: '1.75', label: '標準' },
  lg: { text: '17px', lh: '1.85', label: '大' },
  xl: { text: '20px', lh: '1.95', label: '特大' },
};

export default function DrillPage() {
  const [adminQuery, setAdminQuery] = useState('');
  const [problems, setProblems] = useState<ProblemType[]>([]);
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState<string>('ALL');
  const [selectedProblemId, setSelectedProblemId] = useState<string>('');

  const [drillNotes, setDrillNotes] = useState('');
  const [activeTab, setActiveTab] = useState<'problem' | 'guide' | 'statute'>('guide');
  const [fontSize, setFontSize] = useState<FontSizeLevel>('base');
  
  const [secondsLeft, setSecondsLeft] = useState(70 * 60);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [aiFeedback, setAiFeedback] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<'synced' | 'saving' | 'offline'>('synced');

  const [statuteSearchQuery, setStatuteSearchQuery] = useState('');
  const [statuteLawFilter, setStatuteLawFilter] = useState('ALL');

  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const admin = params.get('admin');
      if (admin) setAdminQuery(`?admin=${encodeURIComponent(admin)}`);
    }
    loadProblems();
  }, []);

  const loadProblems = async () => {
    try {
      const { data } = await supabase.from('problems').select('*').order('created_at', { ascending: false });
      if (data && data.length > 0) {
        setProblems(data);
        setSelectedProblemId(data[0].id);
        loadDraft(data[0].id);
      }
    } catch (e) {
      console.warn('問題ロードエラー:', e);
    }
  };

  const loadDraft = async (probId: string) => {
    try {
      const { data } = await supabase.from('practice_drafts').select('*').eq('problem_id', probId).single();
      if (data) {
        if (data.drill_notes) setDrillNotes(data.drill_notes);
        if (data.seconds_left) setSecondsLeft(data.seconds_left);
      } else {
        setDrillNotes('');
      }
    } catch (e) {
      setDrillNotes('');
    }
  };

  const triggerAutoSave = (notes: string, sec: number) => {
    setSyncStatus('saving');
    if (autoSaveTimeoutRef.current) clearTimeout(autoSaveTimeoutRef.current);
    autoSaveTimeoutRef.current = setTimeout(async () => {
      try {
        await supabase.from('practice_drafts').upsert({
          problem_id: currentProblem.id,
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

  const handleNotesChange = (text: string) => {
    setDrillNotes(text);
    triggerAutoSave(text, secondsLeft);
  };

  const availableSubjects = useMemo(() => {
    return Array.from(new Set(problems.map((p) => p.subject).filter(Boolean)));
  }, [problems]);

  const filteredProblems = useMemo(() => {
    if (selectedSubjectFilter === 'ALL') return problems;
    return problems.filter((p) => p.subject === selectedSubjectFilter);
  }, [problems, selectedSubjectFilter]);

  const currentProblem = problems.find((p) => p.id === selectedProblemId) || filteredProblems[0] || {
    id: 'sample',
    subject: '刑法',
    source_exam: '予備試験',
    target_issue: '共犯からの離脱',
    fact_context: '問題文を読み込み中...',
    time_limit_minutes: 70
  };

  const currentDrill = SUBJECT_DRILL_DATA[currentProblem.subject] || SUBJECT_DRILL_DATA['刑法'];

  const handleSubjectChange = (newSubject: string) => {
    setSelectedSubjectFilter(newSubject);
    const targetList = newSubject === 'ALL' ? problems : problems.filter((p) => p.subject === newSubject);
    if (targetList[0]) {
      setSelectedProblemId(targetList[0].id);
      loadDraft(targetList[0].id);
    }
  };

  const handleProblemChange = (newId: string) => {
    setSelectedProblemId(newId);
    loadDraft(newId);
  };

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

  // 即死地雷＆三段論法のAIチェック
  const handleEvaluateDrill = async () => {
    if (!drillNotes.trim()) {
      alert('ドリル構成メモが入力されていません。');
      return;
    }
    setIsEvaluating(true);
    setAiFeedback(null);
    try {
      const res = await fetch('/api/evaluate-draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userDraft: `【答案構成・ドリルメモの即死地雷チェック依頼】\n${drillNotes}`,
          problemText: currentProblem.fact_context,
          timeSpentSeconds: 70 * 60 - secondsLeft,
          standardNorm: currentProblem.standard_norm,
          keyFacts: currentProblem.key_facts,
        }),
      });
      const data = await res.json();
      setAiFeedback(data.feedback || '講評を受信できませんでした。');
    } catch (e: unknown) {
      alert(`判定エラー: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setIsEvaluating(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-56px)] bg-slate-100 text-slate-800 flex flex-col font-sans">
      
      {/* practiceと完全同期したヘッダー */}
      <header className="bg-white border-b border-slate-200 px-4 py-2 flex justify-between items-center shadow-sm flex-wrap gap-2">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-xl">📝</span>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1">
              <span className="text-[11px] font-bold text-slate-500">科目:</span>
              <select
                value={selectedSubjectFilter}
                onChange={(e) => handleSubjectChange(e.target.value)}
                className="text-xs font-bold py-1 px-2 rounded-md border border-blue-600 bg-blue-50 text-blue-700 outline-none"
              >
                <option value="ALL">全科目 ({problems.length})</option>
                {availableSubjects.map((sub) => (
                  <option key={sub} value={sub}>{sub}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-1">
              <span className="text-[11px] font-bold text-slate-500">問題:</span>
              <select
                value={selectedProblemId}
                onChange={(e) => handleProblemChange(e.target.value)}
                className="text-xs font-bold py-1 px-2 rounded-md border border-slate-300 bg-white text-slate-800 outline-none max-w-[280px]"
              >
                {filteredProblems.map((p) => (
                  <option key={p.id} value={p.id}>
                    [{p.subject}] {p.target_issue}
                  </option>
                ))}
              </select>
            </div>

            <span className="text-[10px] px-1.5 py-0.5 rounded font-bold bg-green-100 text-green-800">
              {syncStatus === 'synced' ? '☁️ クラウド保存済' : '⏳ 保存中...'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* 文字サイズ */}
          <div className="flex items-center bg-slate-50 border border-slate-200 rounded px-1 py-0.5 gap-1">
            <span className="text-[10px] font-bold text-slate-500">🔍</span>
            {(['sm', 'base', 'lg', 'xl'] as FontSizeLevel[]).map((level) => (
              <button
                key={level}
                onClick={() => setFontSize(level)}
                className={`px-1.5 py-0.5 text-[10px] font-bold rounded ${fontSize === level ? 'bg-blue-600 text-white' : 'text-slate-600'}`}
              >
                {fontSizes[level].label}
              </button>
            ))}
          </div>

          {/* 70分タイマー */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-2 py-1 rounded text-xs">
            <span className="font-mono font-bold text-slate-800">⏱ {formatTimer(secondsLeft)}</span>
            <button
              onClick={() => setIsTimerRunning(!isTimerRunning)}
              className="text-[10px] font-bold px-1.5 py-0.5 bg-white border border-slate-300 rounded"
            >
              {isTimerRunning ? '停止' : '開始'}
            </button>
          </div>

          <Link
            href={`/practice${adminQuery}`}
            className="px-2.5 py-1 bg-blue-600 text-white text-xs font-bold rounded hover:bg-blue-700 transition"
          >
            ⚖️ CBT起案室
          </Link>
          <Link
            href={`/anki${adminQuery}`}
            className="px-2.5 py-1 bg-white border border-slate-300 text-slate-700 text-xs font-bold rounded hover:bg-slate-50 transition"
          >
            📇 暗記カード
          </Link>
        </div>
      </header>

      {/* 2ペインメイン作業エリア */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 h-[calc(100vh-105px)] overflow-hidden">
        
        {/* 左ペイン：ガイド・設問・六法（5カラム） */}
        <div className="lg:col-span-5 bg-white border-r border-slate-200 flex flex-col h-full overflow-hidden">
          <div className="flex border-b border-slate-200 bg-slate-50 px-2">
            <button
              onClick={() => setActiveTab('guide')}
              className={`py-2 px-3 text-xs font-bold border-b-2 ${activeTab === 'guide' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500'}`}
            >
              🎯 即死地雷＆思考枠組
            </button>
            <button
              onClick={() => setActiveTab('problem')}
              className={`py-2 px-3 text-xs font-bold border-b-2 ${activeTab === 'problem' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500'}`}
            >
              📄 事実・設問
            </button>
            <button
              onClick={() => setActiveTab('statute')}
              className={`py-2 px-3 text-xs font-bold border-b-2 ${activeTab === 'statute' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500'}`}
            >
              📖 電子六法
            </button>
          </div>

          <div className="flex-1 p-4 overflow-y-auto space-y-4 text-xs" style={{ fontSize: fontSizes[fontSize].text, lineHeight: fontSizes[fontSize].lh }}>
            {activeTab === 'guide' && (
              <div className="space-y-4">
                <div className="bg-rose-50 border border-rose-200 rounded-lg p-3">
                  <div className="text-rose-900 font-bold mb-2 flex items-center gap-1">
                    🚨 考査委員の即死地雷（致命的減点項目）
                  </div>
                  <ul className="list-disc pl-4 space-y-1 text-rose-800">
                    {currentDrill.fatalMistakes.map((m, idx) => (
                      <li key={idx}>{m}</li>
                    ))}
                  </ul>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                  <div className="text-slate-800 font-bold mb-2">📐 答案思考フレームワーク</div>
                  <div className="space-y-1 text-slate-600 font-mono text-[11px]">
                    {currentDrill.logicFramework.map((fw, idx) => (
                      <div key={idx}>{fw}</div>
                    ))}
                  </div>
                </div>

                <button
                  onClick={() => handleNotesChange(currentDrill.defaultTemplate)}
                  className="w-full py-2 bg-blue-50 border border-blue-200 text-blue-700 font-bold rounded-lg text-xs hover:bg-blue-100 transition"
                >
                  📋 標準答案構成テンプレートを右側に挿入
                </button>
              </div>
            )}

            {activeTab === 'problem' && (
              <div className="whitespace-pre-wrap font-serif text-slate-800 leading-relaxed">
                {currentProblem.fact_context}
              </div>
            )}

            {activeTab === 'statute' && (
              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="条文番号または語句 (例: 60, 482, 21)"
                  value={statuteSearchQuery}
                  onChange={(e) => setStatuteSearchQuery(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded text-xs outline-none"
                />
                <div className="space-y-2">
                  {MASTER_STATUTES.filter(s => !statuteSearchQuery || s.text.includes(statuteSearchQuery) || s.title.includes(statuteSearchQuery)).map((st, i) => (
                    <div key={i} className="p-2 bg-slate-50 border border-slate-200 rounded">
                      <div className="flex justify-between font-bold text-slate-800 mb-1">
                        <span>{st.law} {st.num} {st.title}</span>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(`【${st.law} ${st.num} ${st.title}】\n${st.text}`);
                            alert('条文をコピーしました');
                          }}
                          className="text-blue-600 hover:underline text-[10px]"
                        >
                          コピー
                        </button>
                      </div>
                      <p className="text-[11px] text-slate-600 font-serif leading-relaxed">{st.text}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 右ペイン：ドリル構成メモ ＆ AI即死地雷チェック（7カラム） */}
        <div className="lg:col-span-7 bg-slate-50 flex flex-col h-full overflow-hidden">
          <div className="p-2.5 bg-white border-b border-slate-200 flex justify-between items-center">
            <span className="text-xs font-bold text-slate-700">✍️ 答案構成・三段論法ドリルエディタ</span>
            <button
              onClick={handleEvaluateDrill}
              disabled={isEvaluating}
              className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded shadow-sm transition"
            >
              {isEvaluating ? '⏳ AI判定中...' : '⚡️ 即死地雷＆三段論法AIチェック'}
            </button>
          </div>

          <div className="flex-1 p-3">
            <textarea
              value={drillNotes}
              onChange={(e) => handleNotesChange(e.target.value)}
              placeholder="ここに構成メモ、検討順序、拾う事実を箇条書きで記入してください。&#10;&#10;例：&#10;第１ 甲の罪責（主犯から先行検討）&#10;１ 実行行為・結果・因果関係&#10;２ 共犯の離脱（物理的・心理的因果性の遮断）&#10;第２ 乙の罪責..."
              className="w-full h-full p-4 border border-slate-200 rounded-lg outline-none font-serif text-slate-900 bg-white shadow-inner resize-none"
              style={{ fontSize: fontSizes[fontSize].text, lineHeight: fontSizes[fontSize].lh }}
            />
          </div>

          {aiFeedback && (
            <div className="h-64 border-t-2 border-amber-300 bg-amber-50/70 p-4 overflow-y-auto">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-bold text-amber-900">⚖️ 考査委員の即死地雷判定講評</span>
                <button onClick={() => setAiFeedback(null)} className="text-xs text-amber-800 font-bold">✕ 閉じる</button>
              </div>
              <div className="text-xs leading-relaxed text-slate-800 whitespace-pre-wrap">
                {aiFeedback}
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
