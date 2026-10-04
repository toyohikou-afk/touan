'use client';

import { useEffect, useState, useMemo, useRef } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

const CBT_MAX_CHARS = 2760;

type SubProblem = {
  id: string;
  subject: string;
  source_exam: string;
  target_issue: string;
  fact_context: string;
  standard_norm: string;
  key_facts: string[];
  suggested_time_minutes: number;
  problem_type?: 'past_exam' | 'adapted';
};

type DissectedSegment = {
  type: 'requirement' | 'purpose' | 'norm' | 'application' | 'conclusion';
  text: string;
  annotation: string;
};

type ThinkingStep = {
  step: number;
  title: string;
  description: string;
};

type ApplicationItem = {
  fact: string;
  evaluation: string;
};

type ClozeTest = {
  target_phrase: string;
  answer: string;
  hint: string;
};

type ModelAnswerAnalysis = {
  pass_reason_summary: string;
  full_model_answer?: string;
  skeleton_answer?: string;
  syllogism_mapping?: {
    major_premise: {
      issue: string;
      purpose: string;
      norm: string;
    };
    minor_premise: {
      facts: string[];
      evaluations: string[];
    };
    conclusion: string;
  };
  statutory_framework?: string;
  thinking_steps?: ThinkingStep[];
  dissected_segments?: DissectedSegment[];
  application_blueprint?: ApplicationItem[];
  cloze_tests?: ClozeTest[];
};

// 安全用デフォルト三段論法マッピング
const SAFE_EMPTY_MAPPING = {
  major_premise: {
    issue: '事案の法的争点と条文要件の確定',
    purpose: '条文の保護法益・立法趣旨からの規範の導出',
    norm: '行為当時の客観的状況を総合考慮した判断枠組みの定立'
  },
  minor_premise: {
    facts: ['問題文の客観的事実の摘示'],
    evaluations: ['規範の各考慮要素に照らした法的評価']
  },
  conclusion: '条文の要件充足性を確定し、結論を導く。'
};

// 即時復旧用フォールバック問題（民法：94条2項類推適用）
const FALLBACK_DEFAULT_PROBLEM: SubProblem = {
  id: 'a1111111-1111-1111-1111-111111111111',
  subject: '民法',
  source_exam: '令和4年 予備試験 実戦改題',
  target_issue: '94条2項類推適用と第三者',
  suggested_time_minutes: 30,
  problem_type: 'adapted',
  standard_norm: '民法94条2項の類推適用により、本人の帰責性と第三者の善意無過失を要件として権利外観法理が成立する。',
  key_facts: ['所有名義の虚偽作出に対する本人の帰責性', '外観の存在', '第三者の信頼（善意・無過失）'],
  fact_context: `【事実】
１ Aは、自己の所有する甲土地について、金融機関からの融資の都合上、親族Bの承諾を得て一時的に名義のみをB名義とする所有権移転登記を経由させた。
２ その後、BはAに無断で、自らが甲土地の真の所有者であると偽り、善意のCに対して甲土地を代金3,000万円で売却し、登記をBからCへと移転した。なお、Cは売買契約締結時に登記簿を閲覧したのみで、現地の占有状況を調査していなかった。
３ AはCに対し、自己が真の所有者であると主張して、甲土地の所有権確認及び登記の抹消を請求した。
４ Aの請求が認められるか否かについて、Cの反論（民法94条2項類推適用の成否）を含めて論ぜよ。`
};

const SUBJECTS = [
  '民法', '刑法', '憲法', '刑事訴訟法', '民事訴訟法', '行政法', '商法・会社法',
  '民事実務基礎', '刑事実務基礎', '経済法'
];

const YEARS = ['令和7年', '令和6年', '令和5年', '令和4年', '令和3年', '令和2年', '令和元年', '平成30年'];

const ISSUE_PRESETS: Record<string, string[]> = {
  民法: ['94条2項類推適用と第三者', '表見代理と無権代理', '詐害行為取消権の要件', '債権譲渡と対抗要件', '不法行為における過失相殺', '所有権留保と即時取得', '解除と第三者の権利'],
  刑法: ['共謀共同正犯の成立要件', '正当防衛と防衛の意思', '誤想防衛・誤想過剰防衛', '不能犯と未遂の区別', '因果関係（介在事情）', '不法領得の意思と窃盗・横領', '詐欺罪における処分行為'],
  憲法: ['表現の自由と文面審査・適用審査', '職業選択の自由と規制目的二分論', '政教分離原則（目的効果基準）', '法の下の平等と合理的区別', '生存権と立法裁量'],
  刑事訴訟法: ['任意捜査の限界と有形力行使', '職務質問に伴う所持品検査', '令状による捜索・差押えの範囲', '逮捕に伴う無令状捜索・差押え', '伝聞法則と非伝聞の区別', '自白法則と違法収集証拠排除法則'],
  民事訴訟法: ['既判力の客観的範囲と作用', '弁論主義の第1テーゼと主要事実', '当事者適格と確認の利益', '補助参加と参加的効力', '相殺の抗弁と二重起訴の禁止'],
  行政法: ['処分性の判断基準（公権力の行使）', '原告適格（法律上の利益を有する者）', '裁量権の逸脱・濫用基準', '理由の提示の瑕疵と治癒', '行政指導と国家賠償'],
  '商法・会社法': ['取締役の忠実義務・善管注意義務', '経営判断の原則', '利益相反取引と会社の承認', '株主総会決議の取消事由', '新株発行の無効と差止め'],
  民事実務基礎: [
    '売買契約に基づく代金支払請求（要件事実と抗弁）',
    '所有権に基づく不動産明渡請求（所有権喪失の抗弁・対抗要件具備による所有権喪失）',
    '貸金返還請求（弁済の抗弁・相殺の抗弁）',
    '譲受債権請求（債権譲渡の通知・対抗要件）',
    '民事保全（仮差押え・仮処分の必要性と疎明）',
    '弁護士職務基本規程（双方代理・利益相反の判断）'
  ],
  刑事実務基礎: [
    '勾留請求に対する裁判官の判断と準抗告の理由',
    '接見指定・接見交通権の保障と制限',
    '保釈請求（権利保釈除外事由と裁量保釈の考慮要素）',
    '客観的間接事実からの犯人性・共謀の推認',
    '公判前整理手続と証明予定事実記載書の証拠開示',
    '弁護人の真実義務と被告人の不当要求（弁護士倫理）'
  ],
  経済法: [
    '不当な取引制限（意思の連絡・相互拘束・競争の実質的制限）',
    '排除型私的独占（正常な競争秩序を逸脱する人為的行為・市場閉鎖効果）',
    '支配型私的独占（他の事業者の事業活動の拘束・支配）',
    '一定の取引分野（市場画定：需要の代替性・供給の代替性）',
    '不公正な取引方法（優越的地位の濫用：継続的取引・著しい不利益）',
    '不公正な取引方法（再販売価格維持行為・正当な理由の有無）',
    '不公正な取引方法（不当廉売：供給に要する費用を下回る対価）'
  ],
};

const STATUTE_DATABASE: Record<string, { [article: string]: string }> = {
  民法: {
    '94': '第九十四条（虚偽表示） 相手方と通じてした虚偽の意思表示は、無効とする。\n２ 前項の規定による意思表示の無効は、善意の第三者に対抗することができない。',
    '110': '第百十条（権限外の行為の表見代理） 前条第一項本文の規定は、代理人がその権限外の行為をした場合において、第三者が代理人の権限があると信ずべき正当な理由があるときについて準用する。',
    '177': '第百七十七条（不動産に関する物権の変動の対抗要件） 不動産に関する物権の得喪及び変更は、不動産登記法その他の登記に関する法律の定めるところに従いその登記をしなければ、第三者に対抗することができない。',
    '415': '第四百十五条（債務不履行による損害賠償） 債務者がその債務の本旨に従った履行をしないとき又は債務の履行が不能であるときは、債権者は、これによって生じた損害の賠償を請求することができる。',
    '555': '第五百五十五条（売買） 売買は、当事者の一方がある財産権を相手方に移転することを約し、相手方がこれに対してその代金を支払うことを約することによって、その効力を生ずる。',
    '709': '第七百九条（不法行為による損害賠償） 故意又は過失によって他人の権利又は法律上保護される利益を侵害した者は、これによって生じた損害を賠償する責任を負う。'
  },
  刑法: {
    '36': '第三十六条（正当防衛） 急迫不正の侵害に対して、自己又は他人の権利を防衛するため、やむを得ずにした行為は、罰しない。\n２ 防衛の程度を超えた行為は、情状により、その刑を減軽し、又は免除することができる。',
    '38': '第三十八条（故意） 罪を犯す意思がない行為は、罰しない。ただし、法律に特別の規定がある場合は、この限りでない。',
    '60': '第六十条（共同正犯） 二人以上共同して犯罪を実行した者は、すべて正犯とする。',
    '199': '第百九十九条（殺人） 人を殺した者は、死刑又は無期若しくは五年以上の懲役に処する。',
    '204': '第二百四条（傷害） 人の身体を傷害した者は、十五年以下の懲役又は五十万円以下の罰金に処する。',
    '235': '第二百三十五条（窃盗） 他人の財物を窃取した者は、窃盗の罪とし、十年以下の懲役又は五十万円以下の罰金に処する。',
    '246': '第二百四十六条（詐欺） 人を欺いて財物を交付させた者は、十年以下の懲役に処する。'
  },
  憲法: {
    '13': '第十三条 すべて国民は、個人として尊重される。生命、自由及び幸福追求に対する国民の権利については、公共の福祉に反しない限り、立法その他の国政の上で、最大の尊重を必要とする。',
    '14': '第十四条 すべて国民は、法の下に平等であつて、人種、信条、性別、社会的身分又は門地により、政治的、経済的又は社会的関係において、差別されない。',
    '21': '第二十一条 集会、結社及び言論、出版その他一切の表現の自由は、これを保障する。\n２ 検閲は、これをしてはならない。通信の秘密は、これを侵してはならない。',
    '22': '第二十二条 何人も、公共の福祉に反しない限り、居住、移転及び職業選択の自由を有する。',
    '31': '第三十一条 何人も、法律の定める手続によらなければ、その生命若しくは自由を奪はれ、又はその他の刑罰を科せられない。'
  },
  刑事訴訟法: {
    '60': '第六十条（勾留の要件） 裁判所は、被告人が罪を犯したことを疑うに足りる相当な理由がある場合で、左の各号の一にあたるときは、これを勾留することができる。\n一 被告人が定まった住居を有しないとき。\n二 被告人が罪証を隠滅すると疑うに足りる相当な理由があるとき。\n三 被告人が逃亡すると疑うに足りる相当な理由があるとき。',
    '218': '第二百十八条（令状による差押え・捜索） 検察官、検察事務官又は司法警察職員は、犯罪の捜査をするについて必要があるときは、裁判官の発する令状により、差押え、記録命令付差押え、捜索又は検証をすることができる。',
    '320': '第三百二十条（伝聞証拠の禁止） 第三百二十一条乃至第三百二十八条に規定する場合を除いては、公判期日における供述に代えて書面を証拠とし、又は公判期日外における他の者の供述を内容とする供述を証拠とすることはできない。'
  },
  民事訴訟法: {
    '114': '第百十四条（既判力の範囲） 確定判決は、主文に包含するものに限り、既判力を有する。\n２ 相殺のために主張した請求の成立又は不成立の判断は、相殺をもって対抗した額について、既判力を有する。',
    '247': '第二百四十七条（自由心証主義） 裁判所は、判決をするに当たっては、口頭弁論の全趣旨及び証拠調べの結果をしん酌して、自由な心証により、事実の主張を真実と認めるべきか否かを判断する。'
  },
  独占禁止法: {
    '2': '第二条（定義・私的独占・不当な取引制限） この法律において「私的独占」とは、事業者が、単独に、又は他の事業者と結合し、若しくは通謀し、その他いかなる方法をもってするかを問わず、他の事業者の事業活動を排除し、又は支配することにより、公共の利益に反して、一定の取引分野における競争を実質的に制限することをいう。\n６ この法律において「不当な取引制限」とは、事業者が、契約、協定その他何らの名義をもってするかを問わず、他の事業者と共同して対価を決定し、維持し、若しくは引き上げ、又は数量、技術、製品、設備若しくは取引の相手方を制限する等相互にその事業活動を拘束し、若しくは遂行することにより、公共の利益に反して、一定の取引分野における競争を実質的に制限することをいう。',
    '3': '第三条（私的独占又は不当な取引制限の禁止） 事業者は、私的独占又は不当な取引制限をしてはならない。',
    '19': '第十九条（不公正な取引方法の禁止） 事業者は、不公正な取引方法を用いてはならない。'
  }
};

export default function CBTPracticePage() {
  const [problem, setProblem] = useState<SubProblem>(FALLBACK_DEFAULT_PROBLEM);
  const [draft, setDraft] = useState('');
  const [history, setHistory] = useState<string[]>(['']);
  const [historyIndex, setHistoryIndex] = useState(0);

  const [loading, setLoading] = useState(false);
  const [fetchingProblem, setFetchingProblem] = useState(false); // 初期状態をfalseにして黒画面フリーズを完全防止
  const [streamedFeedback, setStreamedFeedback] = useState('');

  // CBT設定
  const [remainingSeconds, setRemainingSeconds] = useState(1800);
  const [isTimerRunning, setIsTimerRunning] = useState(true);
  const [fontSizeLevel, setFontSizeLevel] = useState<1 | 2 | 3 | 4>(2);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // 電子六法
  const [statuteLaw, setStatuteLaw] = useState('民法');
  const [statuteArticleQuery, setStatuteArticleQuery] = useState('');
  const [statuteSearchResult, setStatuteSearchResult] = useState<string>('');

  // 独自機能ドロワー
  const [showAssistantDrawer, setShowAssistantDrawer] = useState(false);
  const [assistantTab, setAssistantTab] = useState<'thinking' | 'mastery' | 'anatomy' | 'review' | 'card'>('thinking');
  
  const [anatomyData, setAnatomyData] = useState<ModelAnswerAnalysis | null>(null);
  const [loadingAnatomy, setLoadingAnatomy] = useState(false);
  const [selectedSegment, setSelectedSegment] = useState<DissectedSegment | null>(null);

  // 穴埋め回答用ステート
  const [revealedAnswers, setRevealedAnswers] = useState<Record<number, boolean>>({});

  // 過去問・改題モーダル
  const [showGeneratorModal, setShowGeneratorModal] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState('民法');
  const [selectedYear, setSelectedYear] = useState('令和4年');
  const [selectedIssue, setSelectedIssue] = useState('94条2項類推適用と第三者');
  const [customIssueText, setCustomIssueText] = useState('');
  const [selectedProblemType, setSelectedProblemType] = useState<'past_exam' | 'adapted'>('adapted');
  const [isGeneratingProblem, setIsGeneratingProblem] = useState(false);

  // 検索置換・再起案
  const [showSearchReplace, setShowSearchReplace] = useState(false);
  const [searchWord, setSearchWord] = useState('');
  const [replaceWord, setReplaceWord] = useState('');
  const [parentSubId, setParentSubId] = useState<string | null>(null);
  const [isRetryMode, setIsRetryMode] = useState(false);

  // 論証カード
  const [generatingCard, setGeneratingCard] = useState(false);
  const [generatedCard, setGeneratedCard] = useState<any>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // 三段論法マッピングの安全取得
  const currentMapping = useMemo(() => {
    if (anatomyData?.syllogism_mapping?.major_premise) {
      return anatomyData.syllogism_mapping;
    }
    return SAFE_EMPTY_MAPPING;
  }, [anatomyData]);

  // DBから模範答案を取得
  const loadAnatomy = async (probTarget: SubProblem) => {
    if (!probTarget?.id) return;
    setLoadingAnatomy(true);
    try {
      const { data: cached } = await supabase
        .from('model_answer_anatomies')
        .select('*')
        .eq('problem_id', probTarget.id)
        .maybeSingle();

      if (cached && cached.full_model_answer) {
        setAnatomyData(cached);
        if (cached.dissected_segments && cached.dissected_segments.length > 0) {
          setSelectedSegment(cached.dissected_segments[0]);
        }
      }
    } catch (err) {
      console.warn('模範答案取得スキップ:', err);
    } finally {
      setLoadingAnatomy(false);
    }
  };

  // 初回読み込み（タイムアウトガード付き）
  useEffect(() => {
    let isMounted = true;

    async function loadInitial() {
      try {
        let targetProblemId: string | null = null;

        if (typeof window !== 'undefined') {
          const savedDraft = sessionStorage.getItem('retry_draft');
          const savedParentId = sessionStorage.getItem('parent_submission_id');
          const savedProblemId = sessionStorage.getItem('retry_problem_id');

          if (savedDraft !== null) {
            setDraft(savedDraft);
            setHistory([savedDraft]);
            setIsRetryMode(true);
            sessionStorage.removeItem('retry_draft');
          }
          if (savedParentId) {
            setParentSubId(savedParentId);
            sessionStorage.removeItem('parent_submission_id');
          }
          if (savedProblemId) {
            targetProblemId = savedProblemId;
            sessionStorage.removeItem('retry_problem_id');
          }
        }

        let query = supabase.from('sub_problems').select('*');
        if (targetProblemId) {
          query = query.eq('id', targetProblemId);
        } else {
          query = query.order('created_at', { ascending: false }).limit(1);
        }

        const { data, error } = await query.maybeSingle();

        if (isMounted && !error && data) {
          const p = data as SubProblem;
          setProblem(p);
          setRemainingSeconds((p.suggested_time_minutes || 30) * 60);
          if (STATUTE_DATABASE[p.subject]) {
            setStatuteLaw(p.subject);
          }
          loadAnatomy(p);
        } else if (isMounted) {
          loadAnatomy(FALLBACK_DEFAULT_PROBLEM);
        }
      } catch (e) {
        console.warn('Supabase接続フォールバック:', e);
      }
    }

    loadInitial();

    return () => {
      isMounted = false;
    };
  }, []);

  // タイマー
  useEffect(() => {
    if (!isTimerRunning || remainingSeconds <= 0) return;
    const timer = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setIsTimerRunning(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [isTimerRunning, remainingSeconds]);

  // 六法検索
  useEffect(() => {
    const lawMap = STATUTE_DATABASE[statuteLaw];
    if (!lawMap) {
      setStatuteSearchResult('※ 該当法令の直接データがありません。条番号またはキーワードを入力してください。');
      return;
    }
    const query = statuteArticleQuery.trim();
    if (!query) {
      const allText = Object.entries(lawMap)
        .map(([art, text]) => `【第${art}条】\n${text}`)
        .join('\n\n');
      setStatuteSearchResult(allText);
      return;
    }
    if (lawMap[query]) {
      setStatuteSearchResult(`【第${query}条】\n${lawMap[query]}`);
      return;
    }
    const matched = Object.entries(lawMap).filter(([art, text]) =>
      art.includes(query) || text.includes(query)
    );
    if (matched.length > 0) {
      setStatuteSearchResult(
        matched.map(([art, text]) => `【第${art}条】\n${text}`).join('\n\n')
      );
    } else {
      setStatuteSearchResult(`「${query}」に一致する条文が見つかりませんでした。`);
    }
  }, [statuteLaw, statuteArticleQuery]);

  const fontSizeStyle = useMemo(() => {
    switch (fontSizeLevel) {
      case 1: return { fontSize: '13px', lineHeight: '22px' };
      case 2: return { fontSize: '15px', lineHeight: '26px' };
      case 3: return { fontSize: '18px', lineHeight: '32px' };
      case 4: return { fontSize: '22px', lineHeight: '40px' };
    }
  }, [fontSizeLevel]);

  const updateDraftWithHistory = (newVal: string) => {
    if (newVal.length > CBT_MAX_CHARS) return;
    setDraft(newVal);
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newVal);
    if (newHistory.length > 50) newHistory.shift();
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      const prevVal = history[historyIndex - 1];
      setHistoryIndex(historyIndex - 1);
      setDraft(prevVal);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const nextVal = history[historyIndex + 1];
      setHistoryIndex(historyIndex + 1);
      setDraft(nextVal);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      setShowConfirmModal(true);
      return;
    }
    if (e.key === 'Tab') {
      e.preventDefault();
      const target = e.currentTarget;
      const start = target.selectionStart;
      const end = target.selectionEnd;
      const val = target.value;
      const nextVal = val.substring(0, start) + ' ' + val.substring(end);
      if (nextVal.length <= CBT_MAX_CHARS) {
        updateDraftWithHistory(nextVal);
        setTimeout(() => {
          if (textareaRef.current) {
            textareaRef.current.selectionStart = textareaRef.current.selectionEnd = start + 1;
          }
        }, 0);
      }
    }
  };

  // 答案提出
  const handleSubmit = async () => {
    if (!draft.trim() || !problem || loading) return;
    setShowConfirmModal(false);
    setLoading(true);
    setIsTimerRunning(false);
    setStreamedFeedback('');
    setShowAssistantDrawer(true);
    setAssistantTab('review');

    const submittedDraft = draft;
    const timeSpent = (problem.suggested_time_minutes || 25) * 60 - remainingSeconds;

    try {
      const { data: { user } } = await supabase.auth.getUser();

      const res = await fetch('/api/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          problemId: problem.id,
          problem,
          userDraft: submittedDraft,
          timeSpentSeconds: timeSpent,
          userId: user?.id ?? null,
          parentSubmissionId: parentSubId,
        }),
      });

      if (!res.ok) throw new Error('通信エラーが発生しました');
      if (!res.body) throw new Error('応答ボディが存在しません');

      const reader = res.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        setStreamedFeedback((prev) => prev + chunk);
      }
    } catch (e: any) {
      alert(`提出エラー: ${e.message}`);
      setIsTimerRunning(true);
    } finally {
      setLoading(false);
    }
  };

  // 問題生成・更新
  const handleCreateNewProblem = async () => {
    const finalIssue = customIssueText.trim() || selectedIssue;
    setIsGeneratingProblem(true);

    try {
      const res = await fetch('/api/generate-sub-problem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: selectedSubject,
          year: selectedYear,
          targetIssue: finalIssue,
          problemType: selectedProblemType,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.problem) {
        throw new Error(data.error || '問題の作成に失敗しました');
      }

      setProblem(data.problem);
      if (data.analysis) {
        setAnatomyData(data.analysis);
        if (data.analysis.dissected_segments && data.analysis.dissected_segments.length > 0) {
          setSelectedSegment(data.analysis.dissected_segments[0]);
        }
      }

      setDraft('');
      setHistory(['']);
      setHistoryIndex(0);
      setStreamedFeedback('');
      setGeneratedCard(null);
      setIsRetryMode(false);
      setParentSubId(null);
      setRemainingSeconds((data.problem.suggested_time_minutes || 30) * 60);
      setIsTimerRunning(true);
      setShowGeneratorModal(false);

      if (STATUTE_DATABASE[data.problem.subject]) {
        setStatuteLaw(data.problem.subject);
      }

      alert(`【${data.problem.subject}：${data.problem.target_issue}】をセットしました。起案を開始できます。`);
    } catch (e: any) {
      alert(`問題作成エラー: ${e.message}`);
    } finally {
      setIsGeneratingProblem(false);
    }
  };

  const handleGenerateAndCopyCard = async () => {
    if (!problem || !streamedFeedback || generatingCard) return;
    setGeneratingCard(true);
    try {
      const res = await fetch('/api/generate-card', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          problem,
          feedbackText: streamedFeedback,
          userDraft: draft,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.card) throw new Error(data.error || '論証カード生成失敗');

      setGeneratedCard(data.card);
      navigator.clipboard.writeText(JSON.stringify(data.card, null, 2));
      setAssistantTab('card');
      alert('論証カードJSONをクリップボードにコピーしました！');
    } catch (err: any) {
      alert(`論証カード生成エラー: ${err.message}`);
    } finally {
      setGeneratingCard(false);
    }
  };

  const handleCopyFullModelAnswer = () => {
    const textToCopy = anatomyData?.full_model_answer;
    if (!textToCopy) return;
    if (draft.trim() && !confirm('現在の起案内容が模範答案全文で置き換えられます。よろしいですか？')) {
      return;
    }
    updateDraftWithHistory(textToCopy);
    setShowAssistantDrawer(false);
  };

  const handleCopySkeletonAnswer = () => {
    const skeletonToCopy = anatomyData?.skeleton_answer;
    if (!skeletonToCopy) return;
    if (draft.trim() && !confirm('現在の起案内容が「骨格・規範のみ（あてはめ空欄）」で置き換えられます。よろしいですか？')) {
      return;
    }
    updateDraftWithHistory(skeletonToCopy);
    setShowAssistantDrawer(false);
  };

  const charCount = draft.length;
  const remainingChars = CBT_MAX_CHARS - charCount;
  const lineCount = useMemo(() => (draft ? draft.split('\n').length : 0), [draft]);

  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const getTagStyle = (type: DissectedSegment['type'], isSelected: boolean) => {
    const base = 'transition-all cursor-pointer rounded px-2 py-0.5 inline-block mx-0.5 my-1 border font-serif ';
    const ring = isSelected ? 'ring-2 ring-slate-900 font-bold shadow-md ' : 'hover:opacity-90 ';
    switch (type) {
      case 'requirement': return base + ring + 'bg-blue-100 text-blue-950 border-blue-400 font-bold';
      case 'purpose': return base + ring + 'bg-emerald-100 text-emerald-950 border-emerald-400 font-bold';
      case 'norm': return base + ring + 'bg-amber-100 text-amber-950 border-amber-400 font-extrabold';
      case 'application': return base + ring + 'bg-rose-100 text-rose-950 border-rose-400 font-bold';
      case 'conclusion': return base + ring + 'bg-slate-200 text-slate-900 border-slate-400 font-bold';
    }
  };

  return (
    <div className="h-screen w-screen bg-[#e2e8f0] text-slate-900 flex flex-col font-sans select-none overflow-hidden">
      
      {/* 1. 本番CBT公式ヘッダーバー */}
      <header className="h-12 bg-[#1e293b] text-white px-5 flex items-center justify-between border-b-2 border-cyan-500 shadow-md shrink-0">
        <div className="flex items-center gap-4">
          <span className="bg-cyan-600 text-white font-extrabold px-3 py-1 rounded text-xs tracking-wider shadow-sm">
            司法試験等 CBTシステム
          </span>
          <span className="text-xs font-bold text-slate-200">
            {problem?.subject} <span className="text-cyan-300 font-extrabold">{problem?.source_exam}</span>
          </span>

          <button
            type="button"
            onClick={() => setShowGeneratorModal(true)}
            className="px-2.5 py-1 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 text-slate-950 font-black text-xs rounded shadow-xs flex items-center gap-1 cursor-pointer transition border border-amber-300"
          >
            <span>✨</span>
            <span>過去問・改題を選択/生成</span>
          </button>
        </div>

        <div className="flex items-center gap-3 text-xs">
          <div className="flex items-center gap-1 bg-slate-900 px-2.5 py-1 rounded border border-slate-700">
            <span className="text-slate-400 text-[11px] font-bold mr-1">文字:</span>
            {[
              { lvl: 1, label: '小' },
              { lvl: 2, label: '中' },
              { lvl: 3, label: '大' },
              { lvl: 4, label: '特大' },
            ].map((btn) => (
              <button
                type="button"
                key={btn.lvl}
                onClick={() => setFontSizeLevel(btn.lvl as any)}
                className={`px-2 py-0.5 rounded font-black text-xs transition cursor-pointer ${
                  fontSizeLevel === btn.lvl
                    ? 'bg-cyan-500 text-slate-950 shadow-sm'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                {btn.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 bg-[#0f172a] px-3 py-1 rounded border border-slate-700 font-mono">
            <span className="text-slate-400 font-bold text-xs">残り時間:</span>
            <span className={`text-base font-extrabold tracking-widest ${remainingSeconds <= 300 ? 'text-rose-400 animate-pulse' : 'text-cyan-400'}`}>
              {formatTimer(remainingSeconds)}
            </span>
          </div>

          <Link
            href="/dashboard"
            className="flex items-center gap-1.5 px-3 py-1 bg-slate-100 hover:bg-cyan-50 text-slate-900 hover:text-cyan-900 font-black text-xs rounded-md shadow-sm border border-slate-300 transition cursor-pointer"
          >
            <span>🕒</span>
            <span>履歴一覧</span>
          </Link>
        </div>
      </header>

      {/* 2. 本番CBT 3ペインメインエリア */}
      <main className="flex-1 grid grid-cols-12 gap-2 p-2 overflow-hidden bg-[#cbd5e1]">
        
        {/* 画面左：問題文ペイン */}
        <section className="col-span-6 bg-white rounded-lg border-2 border-slate-300 shadow-sm flex flex-col overflow-hidden">
          <div className="h-9 bg-slate-100 border-b border-slate-300 px-4 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <span className="w-2 h-3.5 bg-cyan-700 rounded-xs" />
              <h2 className="text-xs font-black text-slate-900 tracking-wider">
                【問題文】{problem?.subject} - {problem?.target_issue}
              </h2>
            </div>
            <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
              <button
                type="button"
                onClick={() => {
                  setShowAssistantDrawer(true);
                  setAssistantTab('mastery');
                  loadAnatomy(problem);
                }}
                className="bg-emerald-100 hover:bg-emerald-200 text-emerald-950 border border-emerald-300 px-2.5 py-0.5 rounded text-[11px] font-black cursor-pointer shadow-2xs"
              >
                🏆 模範答案・三段論法を見る
              </button>
            </div>
          </div>
          
          <div className="flex-1 p-5 overflow-y-auto select-text font-serif bg-[#fcfcfc] text-slate-900 leading-relaxed">
            <div style={fontSizeStyle} className="whitespace-pre-wrap selection:bg-amber-200 selection:text-slate-950">
              {problem?.fact_context}
            </div>
          </div>
        </section>

        {/* 画面右ペイン */}
        <div className="col-span-6 flex flex-col gap-2 overflow-hidden">
          
          {/* 右上：電子六法 */}
          <section className="h-[38%] bg-white rounded-lg border-2 border-slate-300 shadow-sm flex flex-col overflow-hidden">
            <div className="h-9 bg-slate-800 text-white px-4 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-cyan-400 text-xs font-black">⚖</span>
                <span className="text-xs font-black tracking-wider">電子六法（条文参照）</span>
              </div>

              <div className="flex items-center gap-1">
                {['民法', '刑法', '憲法', '刑事訴訟法', '民事訴訟法', '独占禁止法'].map((law) => (
                  <button
                    type="button"
                    key={law}
                    onClick={() => setStatuteLaw(law)}
                    className={`px-2 py-0.5 rounded text-[11px] font-bold transition cursor-pointer ${
                      statuteLaw === law ? 'bg-cyan-500 text-slate-950 font-black' : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    {law}
                  </button>
                ))}
              </div>
            </div>

            <div className="h-8 bg-slate-100 border-b border-slate-300 px-3 flex items-center gap-2 shrink-0 text-xs">
              <span className="text-slate-700 font-bold text-[11px]">条番号 / 語句:</span>
              <input
                type="text"
                value={statuteArticleQuery}
                onChange={(e) => setStatuteArticleQuery(e.target.value)}
                placeholder="例: 94, 110, 177, 709..."
                className="bg-white border border-slate-300 rounded px-2 py-0.5 text-xs text-slate-900 focus:outline-none focus:border-cyan-600 w-44 font-bold select-text"
              />
              <span className="text-[11px] text-slate-500 ml-auto">※ 条文文言をそのまま確認・起案に引用可能</span>
            </div>

            <div className="flex-1 p-3 overflow-y-auto font-serif text-slate-800 bg-[#f8fafc] text-xs leading-relaxed select-text">
              <pre className="whitespace-pre-wrap font-serif text-xs">{statuteSearchResult}</pre>
            </div>
          </section>

          {/* 右下：答案作成エディタ */}
          <section className="flex-1 bg-white rounded-lg border-2 border-slate-300 shadow-sm flex flex-col overflow-hidden">
            <div className="h-9 bg-slate-100 border-b border-slate-300 px-4 flex items-center justify-between shrink-0 text-xs">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleUndo}
                  disabled={historyIndex <= 0}
                  className="px-2.5 py-1 bg-white border border-slate-300 rounded hover:bg-slate-50 disabled:opacity-40 font-bold text-slate-800 text-[11px] cursor-pointer"
                >
                  ↶ 元に戻す
                </button>
                <button
                  type="button"
                  onClick={handleRedo}
                  disabled={historyIndex >= history.length - 1}
                  className="px-2.5 py-1 bg-white border border-slate-300 rounded hover:bg-slate-50 disabled:opacity-40 font-bold text-slate-800 text-[11px] cursor-pointer"
                >
                  ↷ やり直す
                </button>
                <button
                  type="button"
                  onClick={() => setShowSearchReplace(!showSearchReplace)}
                  className={`px-2.5 py-1 border rounded font-bold text-[11px] cursor-pointer ${
                    showSearchReplace ? 'bg-cyan-100 border-cyan-500 text-cyan-950' : 'bg-white border-slate-300 text-slate-800'
                  }`}
                >
                  🔍 検索・置換
                </button>
              </div>

              <div className="flex items-center gap-3 font-mono text-xs">
                <span className="text-slate-800 font-bold">
                  行数: <strong className="text-slate-950 font-black">{lineCount}</strong> 行
                </span>
                <span className="text-slate-800 font-bold">
                  字数: <strong className={`text-sm font-black ${charCount >= 2700 ? 'text-rose-600' : 'text-cyan-800'}`}>{charCount}</strong> / {CBT_MAX_CHARS}字
                </span>
                <span className={`px-2 py-0.5 rounded font-black text-[11px] border ${
                  remainingChars <= 100 ? 'bg-rose-100 text-rose-900 border-rose-400' : 'bg-slate-200 text-slate-900 border-slate-300'
                }`}>
                  残 {remainingChars} 字
                </span>
              </div>
            </div>

            {showSearchReplace && (
              <div className="h-8 bg-slate-50 border-b border-slate-300 px-3 flex items-center gap-2 shrink-0 text-xs">
                <input
                  type="text"
                  value={searchWord}
                  onChange={(e) => setSearchWord(e.target.value)}
                  placeholder="検索文字列"
                  className="bg-white border border-slate-300 rounded px-2 py-0.5 text-xs text-slate-900 w-32 font-bold select-text"
                />
                <input
                  type="text"
                  value={replaceWord}
                  onChange={(e) => setReplaceWord(e.target.value)}
                  placeholder="置換後"
                  className="bg-white border border-slate-300 rounded px-2 py-0.5 text-xs text-slate-900 w-32 font-bold select-text"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (!searchWord) return;
                    updateDraftWithHistory(draft.split(searchWord).join(replaceWord));
                  }}
                  className="px-2.5 py-0.5 bg-cyan-700 text-white rounded font-bold text-xs cursor-pointer"
                >
                  一括置換
                </button>
                <button type="button" onClick={() => setShowSearchReplace(false)} className="text-slate-500 hover:text-slate-900 ml-auto font-bold">✕</button>
              </div>
            )}

            <div className="flex-1 relative flex flex-col bg-white">
              <textarea
                ref={textareaRef}
                value={draft}
                onChange={(e) => updateDraftWithHistory(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={loading}
                placeholder="第１ 設問に対する解答&#10;１ 条文要件の確定と問題提起&#10;２ 保護法益・趣旨からの規範定立（大前提）&#10;３ 事実の摘示と法的評価（小前提：生の事実のあてはめ）&#10;４ 結論&#10;（Tabキーで全角一字下げ。上限2,760文字・本番答案用紙4枚相当）"
                style={fontSizeStyle}
                className="w-full flex-1 p-4 text-slate-900 placeholder-slate-400 resize-none focus:outline-none font-serif select-text"
                spellCheck={false}
                maxLength={CBT_MAX_CHARS}
              />
            </div>

            <div className="h-11 bg-slate-200 border-t border-slate-300 px-4 flex items-center justify-between shrink-0 text-xs">
              <span className="text-slate-700 font-bold text-[11px]">
                💡 <kbd className="bg-white border border-slate-300 rounded px-1.5 py-0.5 font-mono text-slate-900">Tab</kbd> で一字下げ ／ <kbd className="bg-white border border-slate-300 rounded px-1.5 py-0.5 font-mono text-slate-900">⌘/Ctrl+Enter</kbd> で提出
              </span>
              <button
                type="button"
                onClick={() => setShowConfirmModal(true)}
                disabled={loading || !draft.trim()}
                className="px-6 py-2 bg-emerald-700 hover:bg-emerald-800 disabled:bg-slate-400 text-white font-black text-xs rounded-md shadow-md transition cursor-pointer flex items-center gap-1.5"
              >
                <span>{isRetryMode ? '🔄 改訂答案を提出して再採点' : '📤 答案を提出して採点を受ける'}</span>
                <span>➔</span>
              </button>
            </div>
          </section>
        </div>
      </main>

      {/* 3. 画面最下部：合格アシスト・ドロワーバー */}
      <footer className="shrink-0 bg-slate-900 border-t-2 border-amber-500 shadow-2xl z-30">
        <div className="h-10 px-5 flex items-center justify-between text-xs">
          <div className="flex items-center gap-3">
            <span className="bg-amber-500 text-slate-950 font-black px-2.5 py-0.5 rounded text-[11px] tracking-wide">
              最速合格アシスト（独自機能）
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => {
                  setShowAssistantDrawer(true);
                  setAssistantTab('thinking');
                  loadAnatomy(problem);
                }}
                className={`px-3 py-1 rounded font-black text-xs transition cursor-pointer ${
                  showAssistantDrawer && assistantTab === 'thinking'
                    ? 'bg-amber-400 text-slate-950 shadow-xs'
                    : 'text-amber-200 hover:bg-slate-800'
                }`}
              >
                💡 1. 思考手順・あてはめ設計図
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowAssistantDrawer(true);
                  setAssistantTab('mastery');
                  loadAnatomy(problem);
                }}
                className={`px-3 py-1 rounded font-black text-xs transition cursor-pointer ${
                  showAssistantDrawer && assistantTab === 'mastery'
                    ? 'bg-emerald-500 text-white shadow-xs font-black'
                    : 'text-emerald-200 hover:bg-slate-800'
                }`}
              >
                🏆 2. 模範答案の修得（三段論法マッピング・転記）
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowAssistantDrawer(true);
                  setAssistantTab('anatomy');
                  loadAnatomy(problem);
                }}
                className={`px-3 py-1 rounded font-black text-xs transition cursor-pointer ${
                  showAssistantDrawer && assistantTab === 'anatomy'
                    ? 'bg-purple-500 text-white shadow-xs'
                    : 'text-purple-200 hover:bg-slate-800'
                }`}
              >
                🔬 3. 合格答案アナトミー（4色解剖）
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowAssistantDrawer(true);
                  setAssistantTab('review');
                }}
                className={`px-3 py-1 rounded font-black text-xs transition cursor-pointer ${
                  showAssistantDrawer && assistantTab === 'review'
                    ? 'bg-indigo-500 text-white shadow-xs'
                    : 'text-indigo-200 hover:bg-slate-800'
                }`}
              >
                ⚖ 4. AI即時採点・添削講評 {streamedFeedback && <span className="w-2 h-2 rounded-full bg-cyan-400 inline-block ml-1" />}
              </button>
              {generatedCard && (
                <button
                  type="button"
                  onClick={() => {
                    setShowAssistantDrawer(true);
                    setAssistantTab('card');
                  }}
                  className={`px-3 py-1 rounded font-black text-xs transition cursor-pointer ${
                    showAssistantDrawer && assistantTab === 'card'
                      ? 'bg-amber-500 text-slate-950 font-black'
                      : 'text-amber-200 hover:bg-slate-800'
                  }`}
                >
                  📋 5. 蓄積論証カード
                </button>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowAssistantDrawer(!showAssistantDrawer)}
            className="text-xs text-slate-300 hover:text-white font-bold flex items-center gap-1 cursor-pointer bg-slate-800 px-3 py-1 rounded border border-slate-700"
          >
            <span>{showAssistantDrawer ? '▼ アシストを閉じる' : '▲ 学習アシストを開く'}</span>
          </button>
        </div>

        {/* 展開時ドロワーパネル */}
        {showAssistantDrawer && (
          <div className="h-88 bg-white text-slate-900 p-4 border-t border-slate-300 overflow-y-auto animate-in slide-in-from-bottom duration-150">
            
            {/* TAB 1: 思考手順 */}
            {assistantTab === 'thinking' && (
              <div className="max-w-6xl mx-auto space-y-4">
                <div className="flex items-center justify-between border-b pb-2">
                  <span className="font-black text-xs text-amber-900">
                    【起案前の合格者思考トレース】白紙の状態で合格者が頭の中で組み立てる手順（{problem?.subject}：{problem?.target_issue}）
                  </span>
                  <span className="text-[11px] text-slate-600 font-bold">
                    ※ この思考順序を真似ることで、答案構成用紙の作成時間が半減します
                  </span>
                </div>

                <div className="grid grid-cols-12 gap-4">
                  <div className="col-span-6 space-y-2.5">
                    <span className="text-xs font-black text-slate-900 block">◆ 合格者の思考手順（4ステップ）</span>
                    {(anatomyData?.thinking_steps || []).map((step, idx) => (
                      <div key={idx} className="bg-slate-50 border border-slate-300 rounded p-2.5 shadow-2xs">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="w-4 h-4 bg-amber-600 text-white rounded-full flex items-center justify-center text-[10px] font-black">
                            {step.step}
                          </span>
                          <span className="font-black text-xs text-slate-900">{step.title}</span>
                        </div>
                        <p style={fontSizeStyle} className="text-slate-700 font-sans pl-6">{step.description}</p>
                      </div>
                    ))}
                  </div>

                  <div className="col-span-6 space-y-2.5">
                    <span className="text-xs font-black text-emerald-950 block">◆ あてはめの設計図（問題文の生事実 ➔ 法的評価）</span>
                    <div className="bg-emerald-50/60 border border-emerald-300 rounded p-3 space-y-2 max-h-60 overflow-y-auto">
                      {(anatomyData?.application_blueprint || []).map((item, idx) => (
                        <div key={idx} className="bg-white p-2.5 rounded border border-emerald-200">
                          <div style={fontSizeStyle} className="font-black text-slate-900 mb-1">
                            <span className="text-emerald-700 mr-1">【拾う事実】</span>{item.fact}
                          </div>
                          <div style={fontSizeStyle} className="text-slate-700 pl-3 border-l-2 border-emerald-400">
                            <span className="font-bold text-slate-900">評価・理由: </span>{item.evaluation}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: 模範答案の修得 */}
            {assistantTab === 'mastery' && (
              <div className="max-w-7xl mx-auto space-y-4">
                
                <div className="flex flex-wrap items-center justify-between border-b pb-2 gap-2">
                  <div>
                    <span className="font-black text-xs text-emerald-900 block">
                      【合格答案修得メソッド】{problem?.subject}：{problem?.target_issue} の法的三段論法（大前提・小前提・結論）
                    </span>
                    <span className="text-[11px] text-slate-600 font-bold">
                      ※ 規範は「事実を評価するための定規」として必要最小限に研ぎ澄まし、生の事実を直接ぶつけることで最高評価（A評価）が得られます
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleCopySkeletonAnswer}
                      className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-black text-xs rounded-md shadow-xs cursor-pointer flex items-center gap-1.5 transition"
                      title="ナンバリング・規範のみをエディタに配置し、あてはめをご自身で起案する練習"
                    >
                      <span>📋</span>
                      <span>骨格・規範のみエディタに挿入（あてはめ自作練習）</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleCopyFullModelAnswer}
                      className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white font-black text-xs rounded-md shadow-xs cursor-pointer flex items-center gap-1.5 transition"
                      title="完成稿全文をエディタに配置してタイピング・写経する練習"
                    >
                      <span>✍️</span>
                      <span>模範答案全文をエディタに挿入（完全写経）</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-12 gap-5">
                  <div className="col-span-7 space-y-3 max-h-64 overflow-y-auto pr-1">
                    
                    {/* ① 大前提 */}
                    <div className="bg-amber-50/80 border-2 border-amber-300 rounded-lg p-3 space-y-1.5 shadow-2xs">
                      <div className="flex items-center justify-between">
                        <span className="font-black text-xs text-amber-950 flex items-center gap-1.5">
                          <span className="px-1.5 py-0.5 bg-amber-600 text-white rounded text-[10px]">1</span>
                          <span>【大前提】判例規範・当てはめ基準の定立（定規の設置）</span>
                        </span>
                        <span className="text-[10px] text-amber-800 font-bold">必要簡潔・事実評価から逆算</span>
                      </div>
                      <div className="bg-white p-2.5 rounded border border-amber-200 font-serif leading-relaxed space-y-1.5">
                        <div style={fontSizeStyle}><strong className="text-amber-900">問題提起：</strong>{currentMapping.major_premise.issue}</div>
                        <div style={fontSizeStyle}><strong className="text-amber-900">趣旨・理由：</strong>{currentMapping.major_premise.purpose}</div>
                        <div style={fontSizeStyle} className="bg-amber-100/60 p-2 rounded border border-amber-300 font-bold text-amber-950">
                          <strong>定立規範：</strong>{currentMapping.major_premise.norm}
                        </div>
                      </div>
                    </div>

                    {/* ② 小前提 */}
                    <div className="bg-rose-50/80 border-2 border-rose-300 rounded-lg p-3 space-y-1.5 shadow-2xs">
                      <div className="flex items-center justify-between">
                        <span className="font-black text-xs text-rose-950 flex items-center gap-1.5">
                          <span className="px-1.5 py-0.5 bg-rose-600 text-white rounded text-[10px]">2</span>
                          <span>【小前提】生の事実の摘示 ➔ 法的評価の接合（説得力の核心）</span>
                        </span>
                        <span className="text-[10px] text-rose-800 font-bold">事実と評価を1対1で対応</span>
                      </div>
                      <div className="space-y-2">
                        {currentMapping.minor_premise.facts.map((factText, fIdx) => (
                          <div key={fIdx} className="bg-white p-2.5 rounded border border-rose-200 font-serif leading-relaxed">
                            <div style={fontSizeStyle} className="text-slate-900 font-bold mb-1">
                              <span className="text-blue-700 font-black mr-1">［拾った生の事実］</span>
                              {factText}
                            </div>
                            <div style={fontSizeStyle} className="text-rose-950 pl-2.5 border-l-2 border-rose-400 font-medium">
                              <span className="text-rose-700 font-black mr-1">［規範にぶつけた評価］</span>
                              {currentMapping.minor_premise.evaluations[fIdx] || '規範の考慮要素に合致し、要件充足を方向付ける。'}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* ③ 結論 */}
                    <div className="bg-slate-100 border-2 border-slate-300 rounded-lg p-2.5 flex items-center justify-between shadow-2xs">
                      <div className="flex items-center gap-2">
                        <span className="px-1.5 py-0.5 bg-slate-700 text-white rounded text-[10px] font-black">3</span>
                        <span className="text-xs font-black text-slate-900">【結論】要件充足の確定：</span>
                        <span style={fontSizeStyle} className="font-serif font-black text-slate-800">{currentMapping.conclusion}</span>
                      </div>
                    </div>
                  </div>

                  {/* 右ペイン */}
                  <div className="col-span-5 flex flex-col gap-3">
                    <div className="flex-1 flex flex-col gap-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black text-slate-900">◆ A評価・模範合格答案（完成稿全文）</span>
                        <span className="text-[11px] text-slate-500 font-mono">
                          {anatomyData?.full_model_answer?.length || 0} 字
                        </span>
                      </div>
                      <div className="bg-slate-50 p-3 rounded-lg border-2 border-slate-300 max-h-40 overflow-y-auto select-text shadow-inner font-serif leading-relaxed text-slate-800 whitespace-pre-wrap">
                        <div style={fontSizeStyle}>
                          {anatomyData?.full_model_answer || '模範答案を準備中...'}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <span className="text-xs font-black text-purple-900 block">◆ 核心キーワード穴埋めセルフテスト</span>
                      <div className="space-y-1.5 max-h-24 overflow-y-auto pr-1">
                        {(anatomyData?.cloze_tests || []).map((cloze, idx) => {
                          const isRevealed = revealedAnswers[idx];
                          return (
                            <div key={idx} className="bg-purple-50 border border-purple-200 rounded p-2 text-xs flex items-center justify-between gap-2 shadow-2xs">
                              <span style={fontSizeStyle} className="font-serif text-slate-900 font-medium truncate">
                                {cloze.target_phrase}
                              </span>
                              <button
                                type="button"
                                onClick={() => setRevealedAnswers((prev) => ({ ...prev, [idx]: !prev[idx] }))}
                                className="px-2 py-0.5 bg-white border border-purple-300 rounded text-[10px] font-black text-purple-900 shrink-0 cursor-pointer hover:bg-purple-100"
                              >
                                {isRevealed ? `正解: ${cloze.answer}` : '答え'}
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: 合格答案アナトミー */}
            {assistantTab === 'anatomy' && (
              <div className="max-w-6xl mx-auto space-y-3">
                <div className="flex items-center justify-between border-b pb-2">
                  <span className="font-black text-xs text-purple-900">【合格答案の4大構造解剖】クリックすると右側に思考手順解説</span>
                  <div className="flex gap-2 text-xs font-bold">
                    <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-950 border border-blue-400">① 条文要件（青）</span>
                    <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-950 border border-emerald-400">② 保護法益・趣旨（緑）</span>
                    <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-950 border border-amber-400">③ 規範定立（黄）</span>
                    <span className="px-2 py-0.5 rounded bg-rose-100 text-rose-950 border border-rose-400">④ 事実摘示と評価（赤）</span>
                  </div>
                </div>

                <div className="grid grid-cols-12 gap-4">
                  <div className="col-span-8 bg-slate-50 p-3 rounded border border-slate-200 font-serif leading-relaxed select-text">
                    <div style={fontSizeStyle}>
                      {(anatomyData?.dissected_segments || []).map((seg, idx) => (
                        <span
                          key={idx}
                          onClick={() => setSelectedSegment(seg)}
                          className={getTagStyle(seg.type, selectedSegment === seg)}
                        >
                          {seg.text}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="col-span-4 bg-purple-50 p-3 rounded border border-purple-200 space-y-2">
                    <span className="font-black text-purple-900 text-xs block">【なぜこの記述が必要なのか（思考手順）】</span>
                    <p style={fontSizeStyle} className="text-slate-800 font-sans leading-relaxed">
                      {selectedSegment ? selectedSegment.annotation : '左側の文章をクリックすると、ここに思考手順の急所が表示されます。'}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 4: AI採点講評 */}
            {assistantTab === 'review' && (
              <div className="max-w-6xl mx-auto space-y-3">
                <div className="flex items-center justify-between border-b pb-2">
                  <span className="font-black text-xs text-indigo-900">【AI採点・添削講評】三段論法・判例規範・生の事実の拾い出し検証</span>
                  <button
                    type="button"
                    onClick={handleGenerateAndCopyCard}
                    disabled={!streamedFeedback || generatingCard}
                    className="px-3 py-1 bg-amber-500 hover:bg-amber-400 disabled:bg-slate-300 text-slate-950 font-black rounded text-xs cursor-pointer shadow-xs"
                  >
                    {generatingCard ? '論証カード化中...' : '📋 論証カードJSONを生成＆コピー'}
                  </button>
                </div>
                <div 
                  style={fontSizeStyle} 
                  className="font-serif text-slate-900 whitespace-pre-wrap leading-relaxed select-text bg-[#f8fafc] p-4 rounded border border-slate-200"
                >
                  {streamedFeedback || '答案を提出すると、ここに詳細な採点・添削講評がストリーミング出力されます。'}
                </div>
              </div>
            )}

            {/* TAB 5: 論証カード */}
            {assistantTab === 'card' && generatedCard && (
              <div className="max-w-5xl mx-auto space-y-3">
                <span className="font-black text-xs text-amber-900 block border-b pb-1">
                  【生成された蓄積論証カード】クリップボードに格納済
                </span>
                <pre style={fontSizeStyle} className="bg-slate-900 text-slate-100 p-3 rounded font-mono select-text max-h-48 overflow-y-auto">
                  {JSON.stringify(generatedCard, null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}
      </footer>

      {/* 4. 過去問・改題ジェネレーターモーダル */}
      {showGeneratorModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-150 pointer-events-auto">
          <div className="bg-[#ffffff] rounded-xl shadow-2xl border-2 border-slate-700 max-w-3xl w-full p-6 space-y-5 animate-in zoom-in-95 duration-150 max-h-[88vh] overflow-y-auto pointer-events-auto">
            
            <div className="flex items-center justify-between border-b-2 border-slate-200 pb-3">
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <span className="text-amber-500 text-xl">✨</span>
                <span>過去問・改題の選択／新規生成</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowGeneratorModal(false)}
                className="text-slate-500 hover:text-slate-900 font-black text-xl cursor-pointer w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs">
              {/* 演習スタイル */}
              <div className="bg-slate-100 p-3 rounded-lg border border-slate-300">
                <label className="block text-slate-900 font-black mb-1.5 text-xs">演習スタイルを選択:</label>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setSelectedProblemType('adapted')}
                    className={`flex-1 p-2.5 rounded-md font-extrabold text-xs border text-left cursor-pointer transition ${
                      selectedProblemType === 'adapted'
                        ? 'bg-cyan-700 text-white border-cyan-800 ring-2 ring-cyan-400 shadow-md font-black'
                        : 'bg-white text-slate-800 border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <div className="font-black flex items-center gap-1.5">
                      {selectedProblemType === 'adapted' && <span>✓</span>}
                      <span>🎯 実戦改題（あてはめ特化・25〜35分）</span>
                    </div>
                    <div className="text-[11px] opacity-90 font-medium mt-0.5">特定論点の生の事実の拾い出しとあてはめ能力を集中訓練</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedProblemType('past_exam')}
                    className={`flex-1 p-2.5 rounded-md font-extrabold text-xs border text-left cursor-pointer transition ${
                      selectedProblemType === 'past_exam'
                        ? 'bg-purple-700 text-white border-purple-800 ring-2 ring-purple-400 shadow-md font-black'
                        : 'bg-white text-slate-800 border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <div className="font-black flex items-center gap-1.5">
                      {selectedProblemType === 'past_exam' && <span>✓</span>}
                      <span>🏛️ 本番過去問全文（長文総合・70分）</span>
                    </div>
                    <div className="text-[11px] opacity-90 font-medium mt-0.5">本試験の全体構造・複数設問の時間配分を完全再現</div>
                  </button>
                </div>
              </div>

              {/* ① 科目選択 */}
              <div>
                <label className="block text-slate-900 font-black mb-1.5 text-xs">① 科目を選択（10科目）:</label>
                <div className="flex flex-wrap gap-1.5">
                  {SUBJECTS.map((sub) => {
                    const isSelected = selectedSubject === sub;
                    return (
                      <button
                        type="button"
                        key={sub}
                        onClick={() => {
                          setSelectedSubject(sub);
                          const presets = ISSUE_PRESETS[sub] || [];
                          if (presets.length > 0) setSelectedIssue(presets[0]);
                          setCustomIssueText('');
                        }}
                        className={`px-3 py-1.5 rounded-md text-xs transition cursor-pointer border flex items-center gap-1 ${
                          isSelected
                            ? 'bg-cyan-700 text-white border-cyan-800 ring-2 ring-cyan-400 shadow-md font-black'
                            : 'bg-white text-slate-800 hover:bg-cyan-50 border-slate-300 font-bold'
                        }`}
                      >
                        {isSelected && <span>✓</span>}
                        <span>{sub}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* ② 年度選択 */}
              <div>
                <label className="block text-slate-900 font-black mb-1.5 text-xs">② 年度を選択:</label>
                <div className="flex flex-wrap gap-1.5">
                  {YEARS.map((yr) => {
                    const isSelected = selectedYear === yr;
                    return (
                      <button
                        type="button"
                        key={yr}
                        onClick={() => setSelectedYear(yr)}
                        className={`px-3.5 py-1.5 rounded-md text-xs transition cursor-pointer border flex items-center gap-1 ${
                          isSelected
                            ? 'bg-purple-700 text-white border-purple-800 ring-2 ring-purple-400 shadow-md font-black'
                            : 'bg-white text-slate-800 hover:bg-purple-50 border-slate-300 font-bold'
                        }`}
                      >
                        {isSelected && <span>✓</span>}
                        <span>{yr}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* ③ 論点選択 */}
              <div>
                <label className="block text-slate-900 font-black mb-1.5 text-xs">
                  ③ 演習論点（{selectedSubject}）:
                </label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {(ISSUE_PRESETS[selectedSubject] || []).map((iss) => {
                    const isSelected = selectedIssue === iss && !customIssueText.trim();
                    return (
                      <button
                        type="button"
                        key={iss}
                        onClick={() => {
                          setSelectedIssue(iss);
                          setCustomIssueText('');
                        }}
                        className={`px-3 py-1.5 rounded-md text-xs transition cursor-pointer border flex items-center gap-1 ${
                          isSelected
                            ? 'bg-amber-600 text-white border-amber-700 ring-2 ring-amber-400 shadow-md font-black'
                            : 'bg-white text-slate-800 hover:bg-amber-50 border-slate-300 font-bold'
                        }`}
                      >
                        {isSelected && <span>✓</span>}
                        <span>{iss}</span>
                      </button>
                    );
                  })}
                </div>
                <input
                  type="text"
                  value={customIssueText}
                  onChange={(e) => setCustomIssueText(e.target.value)}
                  placeholder="または自由入力（例: 不法行為、無権代理、表見代理...）"
                  className="w-full bg-slate-50 border-2 border-slate-300 rounded px-3 py-1.5 text-slate-900 font-bold text-xs select-text focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t-2 border-slate-200">
              <button
                type="button"
                onClick={() => setShowGeneratorModal(false)}
                disabled={isGeneratingProblem}
                className="px-5 py-2 rounded-lg border-2 border-slate-300 text-slate-800 text-xs font-extrabold cursor-pointer hover:bg-slate-50"
              >
                キャンセル
              </button>
              <button
                type="button"
                onClick={handleCreateNewProblem}
                disabled={isGeneratingProblem}
                className="px-6 py-2.5 rounded-lg bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 text-white font-black text-xs shadow-md transition cursor-pointer flex items-center gap-2"
              >
                {isGeneratingProblem ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>問題を生成してSupabaseに保存中...</span>
                  </>
                ) : (
                  <>
                    <span>✨ この問題で起案開始</span>
                    <span>➔</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. 提出確認モーダル */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-150 pointer-events-auto">
          <div className="bg-[#ffffff] rounded-xl shadow-2xl border-2 border-slate-700 max-w-md w-full p-6 space-y-5 animate-in zoom-in-95 duration-150 pointer-events-auto">
            <div className="flex items-center justify-between border-b-2 border-slate-200 pb-3">
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <span className="text-cyan-700 text-lg">📝</span>
                <span>答案提出の最終確認</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="text-slate-400 hover:text-slate-700 font-bold text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <p className="text-slate-800 font-bold leading-relaxed">
                作成した答案を提出し、AIによる詳細採点・添削（三段論法・要件事実・生の事実の評価）を開始します。
              </p>

              <div className="bg-slate-100 p-4 rounded-lg border-2 border-slate-300 font-mono space-y-2 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-slate-700 font-bold">作成文字数:</span>
                  <strong className="text-slate-950 font-black text-sm">{charCount} / {CBT_MAX_CHARS} 字</strong>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-700 font-bold">作成行数:</span>
                  <strong className="text-slate-950 font-black text-sm">{lineCount} 行</strong>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-700 font-bold">残り時間:</span>
                  <strong className="text-cyan-800 font-black text-sm">{formatTimer(remainingSeconds)}</strong>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="px-5 py-2.5 rounded-lg border-2 border-slate-300 text-slate-800 text-xs font-extrabold cursor-pointer hover:bg-slate-50"
              >
                起案に戻る
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                className="px-6 py-2.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-black text-xs shadow-md transition cursor-pointer flex items-center gap-1.5"
              >
                <span>確定して提出・採点開始</span>
                <span>➔</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}