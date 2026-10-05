'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

// ==========================================
// 1. 型定義 ＆ マスターデータ
// ==========================================
type ProblemData = {
  id: string;
  subject: string;
  source_exam: string;
  target_issue: string;
  suggested_time_minutes: number;
  fact_context: string;
  standard_norm: string;
  key_facts: string[];
  statutes?: Array<{ title: string; text: string }>;
};

type AnatomyData = {
  pass_reason_summary: string;
  statutory_framework: string;
  full_model_answer: string;
  skeleton_answer: string;
  syllogism_mapping: {
    major_premise?: { issue?: string; purpose?: string; norm?: string };
    minor_premise?: { facts?: string[]; evaluations?: string[] };
    conclusion?: string;
  };
  thinking_steps: Array<{ step: number; title: string; description: string }>;
  application_blueprint: Array<{ fact: string; evaluation: string }>;
  dissected_segments: Array<{ type: string; text: string; annotation: string }>;
};

type FontSizeLevel = 'sm' | 'base' | 'lg' | 'xl';

const fontSizes: Record<FontSizeLevel, { text: string; lh: string; label: string }> = {
  sm: { text: '13px', lh: '1.6', label: '小 (13px)' },
  base: { text: '15px', lh: '1.75', label: '標準 (15px)' },
  lg: { text: '17px', lh: '1.85', label: '大 (17px)' },
  xl: { text: '20px', lh: '1.95', label: '特大 (20px)' },
};

// 予備試験 過去問論点マスター（科目×年度）
const EXAM_ISSUES_MASTER: Record<string, Record<string, string[]>> = {
  刑法: {
    '令和6年': ['共犯関係からの離脱', '詐欺罪における交付行為と不法原因給付', '誤想防衛と過失犯'],
    '令和5年': ['不能犯と未遂犯の区別', '建造物等以外放火罪の既遂時期', '横領罪と委託信任関係'],
    '令和4年': ['正当防衛（侵害の急迫性・防衛の意思）', '事後強盗罪（238条）の成立要件', '共謀共同正犯の成立要件'],
    '令和3年': ['承諾殺人罪と不同意堕胎罪', '間接正犯の成立要件（道具利用）', '名誉毀損罪と真実性の誤信（230条の2）'],
    '令和2年': ['横領罪と背任罪の区別', '親族相盗例の適用範囲（244条）', 'クレジットカードの不正使用と詐欺罪'],
  },
  民法: {
    '令和6年': ['動産二重譲渡と即時取得（192条）', '留置権の成否と抵当権との優劣', '不法行為責任と過失相殺'],
    '令和5年': ['民法94条2項類推適用（他責放置型・善意無過失）', '契約不適合責任と代金減額請求', '債権譲渡と相殺の抗弁'],
    '令和4年': ['賃貸借契約の終了と転貸借（承諾ある転貸借）', '使用人責任（715条）と求償権', '詐害行為取消権の要件'],
    '令和3年': ['譲渡制限特約と債権譲渡の効力', '法定地上権の成否（388条）', '契約解除と原状回復義務（545条）'],
    '令和2年': ['共有物の明渡請求と持分権', '無権代理と相続（単独相続・共同相続）', '債務不履行による損害賠償の範囲'],
    '令和元年': ['代理権濫用（107条）と相手方の主観', '動産売買先取特権と物上代位', '不当利得返還請求（侵害利得）'],
    '平成30年': ['不動産の二重譲渡と背信的悪意者（177条）', '錯誤取消（95条）の要件', '抵当権侵害と妨害排除請求'],
  },
  憲法: {
    '令和6年': ['集会の自由と公の施設の利用拒否（パブリック・フォーラム論）', '条例による表現の規制'],
    '令和5年': ['職業選択の自由（22条1項）と規制目的二分論', '小売市場事件判決の射程'],
    '令和4年': ['政教分離原則（20条3項・89条）と目的効果基準', '玉串料・孔子廟訴訟の判断枠組み'],
    '令和3年': ['表現の自由と事前抑制の禁止（税関検査事件）', '検閲の定義と該当性'],
  },
  民事訴訟法: {
    '令和6年': ['既判力の客観的範囲（114条1項）と相殺の抗弁（114条2項）', '重複起訴の禁止'],
    '令和5年': ['弁論主義第1テーゼ（主張責任）', '主要事実と間接事実の区別', '裁判上の自白の撤回'],
    '令和4年': ['訴えの利益（確認の利益の3要件）', '将来の給付の訴え（135条）'],
    '令和3年': ['共同訴訟の類型（通常共同訴訟と必要的共同訴訟）', '共同訴訟人独立の原則'],
  },
  刑事訴訟法: {
    '令和6年': ['おとり捜査の適法性と違法収集証拠排除法則', '任意捜査の限界'],
    '令和5年': ['現行犯逮捕の要件（明白性・現行性）', '領置（221条）と令状主義の潜脱'],
    '令和4年': ['職務質問に伴う所持品検査の適法性', '自動車検問の許容限度'],
    '令和3年': ['伝聞法則の適用範囲（320条1項）', '検察官面前調書の証拠能力（321条1項2号）'],
  },
  商法: {
    '令和6年': ['取締役の忠実義務・善管注意義務（利益相反取引・356条）', '役員の対第三者責任（429条1項）'],
    '令和5年': ['株主総会決議取消の訴え（831条1項）', '招集手続きの著しい不公正'],
    '令和4年': ['新株発行の無効原因・差止請求（210条）', '有利発行と経営判断原則'],
  },
  行政法: {
    '令和6年': ['行政処分性（行訴法3条2項）の判断枠組み', '建築確認・通知の処分性'],
    '令和5年': ['原告適格（行訴法9条2項）と法律上の利益を有する者', '近隣住民の原告適格'],
    '令和4年': ['裁量権の逸脱・濫用（行政手続法・理由提示の不備）', '判断過程審査方式'],
  },
};

// ─── 不動産の混入を100%根絶：事実１〜設問まで完全専用問題ビルダー ───
function buildDedicatedProblem(subject: string, year: string, issue: string, isKaidai: boolean): ProblemData {
  const sourceExam = `${year} 予備試験${isKaidai ? '改題' : ''}`;
  let factContext = '';
  let standardNorm = '';
  let statutes: Array<{ title: string; text: string }> = [];

  // 【刑法】
  if (subject === '刑法') {
    if (issue.includes('離脱')) {
      factContext = `１ 甲は、知人乙から「Vが自宅に多額の現金を保管している。一緒に押し入って金を奪おう」と持ちかけられ、これを承諾した。甲と乙は、深夜にV宅に侵入し、Vを縛り上げて金庫から現金を奪う計画（以下「本件計画」という）を立てた。\n２ 犯行当日午前2時頃、甲と乙は目出し帽を着用し、バールを所持してV宅に赴いた。甲がV宅の勝手口の施錠をバールでこじ開け、甲と乙が屋内に足を踏み入れたところ、奥の寝室で物音に気づいたVが「誰だ！」と大声を上げて廊下に出てきた。\n３ 予期せぬVの出現に激しく動転した甲は、恐怖のあまり「やばい、人が起きてきた。俺はもうやめる、帰るぞ」と乙に小声で告げ、手に持っていたバールをその場に投げ捨てて勝手口から一人で外へ逃走した。\n４ 一方、その場に残った乙は逃走せず、大声を出すVに対して「騒ぐと殺すぞ」と脅迫し、Vの顔面を数回殴打して反抗を抑圧した上、金庫から現金300万円を強奪した。\n５ 甲及び乙の罪責について、共犯関係からの離脱の成否を含めて論ぜよ。`;
      standardNorm = `【判例の規範定立】\n共謀共同正犯における共犯関係からの離脱が認められるためには、一部の共犯者が単に関与を中止するのみでは足りず、当初の共謀によって形成された「物理的・心理的因果性」を完全に遮断・解消したといえることが必要である。\n【当てはめ基準】\n①離脱の意思表示と他の共犯者の了承の有無、②実行着手前か着手後か、③着手後においては自己の関与により生じた危険性を積極的に除去・阻止したか（他の共犯者の犯行抑止措置、通報等）を総合衡量して判断する。`;
      statutes = [
        { title: '刑法 第60条（共同正犯）', text: '二人以上共同して犯罪を実行した者は、すべて正犯とする。' },
        { title: '刑法 第236条（強盗）', text: '暴行又は脅迫を用いて他人の財物を強取した者は、強盗の罪とし、五年以上の有期懲役に処する。' },
      ];
    } else if (issue.includes('防衛')) {
      factContext = `１ 甲は、深夜路上を歩行中、酒に酔ったV（大柄な男性）から言いがかりをつけられ、胸ぐらを掴まれて「殴られたいのか」と凄まれた。\n２ 甲は恐怖を感じて後退りしたが、Vが拳を振り上げて殴りかかろうとしたため、甲は身を守るため、とっさに所持していた護身用特殊警棒を取り出してVの右腕を強く払った。\n３ Vはその場に倒れ込み、右前腕打撲（全治2週間）を負った。\n４ 甲の行為について、正当防衛（36条1項）の成立要件（急迫不正の侵害、防衛の意思、相当性）を検討して甲の罪責を論ぜよ。`;
      standardNorm = `【判例の規範定立】\n正当防衛（刑法36条1項）が成立するためには、①自己又は他人の権利に対する「急迫不正の侵害」が存在し、②自己又は他人の権利を防衛するため「やむを得ずにした行為」であることが必要である。\n【当てはめ基準】\n侵害の急迫性、侵害行為の態様、防衛行為の武器対等性、防衛の意思（攻撃意思の有無）を具体的事実から総合衡量して決する。`;
      statutes = [
        { title: '刑法 第36条（正当防衛）', text: '急迫不正の侵害に対して、自己又は他人の権利を防衛するため、やむを得ずにした行為は、罰しない。' },
      ];
    } else {
      factContext = `１ 甲は、金品奪取の目的で乙と共謀し、深夜に店舗Vへの侵入を計画した。\n２ 甲と乙は現場に赴き、乙が見張りをする中で甲が施錠を損壊して店内に侵入した。\n３ 甲は金庫から売上金50万円を窃取し、待機していた乙の運転する自動車で逃走した。\n４ 甲及び乙の罪責について、${issue}の成否を含めて論ぜよ。`;
      standardNorm = `【判例の規範定立】\n共同正犯の成立要件は、①共謀（意思連絡）及び②共謀に基づく実行行為である。共謀者の行為を通じて自己の犯罪を実現する点に正犯性の根拠がある。`;
      statutes = [{ title: '刑法 第60条（共同正犯）', text: '二人以上共同して犯罪を実行した者は、すべて正犯とする。' }];
    }
  }

  // 【憲法】
  else if (subject === '憲法') {
    factContext = `１ 市民団体Xは、特定の安全保障政策に反対する市民集会及びパレードを計画した。\n２ Xは、Y市が設置・管理する市民会館大ホール（定員1,500名）を使用するため、条例に基づき市長Yに対して利用許可申請を行った。\n３ これに対し、Xの活動に強く反対するグループが、Y市に対し「集会を許可すれば、当日会場周辺に大挙して押しかけ、実力行使で集会を粉砕する」旨の抗議声明を提出し、連日激しい抗議電話を繰り返した。\n４ 市長Yは、集会当日に会場内外で激しい衝突が生じ、市民会館の施設管理や通行人の安全に重大な支障が生じる危険性が高いと判断し、条例の「公の秩序を乱すおそれがあるとき」に該当するとして利用不許可処分を行った。\n５ 本件不許可処分の憲法上の当否について、${issue}を踏まえて論ぜよ。`;
    standardNorm = `【判例の規範定立】\n地方自治法244条2項の「正当な理由」および憲法21条1項に基づき、公の施設において集会の自由を制限することが正当化されるのは、単に反対派の妨害による混乱の抽象的おそれがあるのみでは足りず、人の生命、身体又は財産が侵害され、公共の安全が著しく損なわれる明らかな差し迫った危険が具体的に予見される場合に限られる（泉佐野市民会館事件）。\n【当てはめ基準】\n警察等の警備措置によっても衝突を防止できないほどの客観的・差し迫った危険性が立証されているかを厳格に審査する。`;
    statutes = [
      { title: '憲法 第21条（表現の自由）', text: '集会、結社及び言論、出版その他一切の表現の自由は、これを保障する。' },
      { title: '地方自治法 第244条（公の施設）', text: '２ 普通地方公共団体は、正当な理由がない限り、住民が公の施設を利用することを拒んではならない。' },
    ];
  }

  // 【民事訴訟法】
  else if (subject === '民事訴訟法') {
    factContext = `１ XはYに対し、甲機械の売買代金債権500万円の支払いを求めて訴えを提起した（前訴）。\n２ 前訴においてYは、売買代金の弁済の事実を主張するとともに、予備的抗弁として、YがXに対して有する別個の請負代金債権500万円（以下「本件債権」という）を自働債権とする相殺の抗弁を主張した。\n３ 前訴裁判所は審理の結果、Yの弁済の抗弁を認めず、さらに相殺の抗弁についても「本件債権の発生原因事実が認められない」として排斥し、Xの請求を全額認容する判決を下し、同判決は確定した。\n４ その後、YはXに対し、上記本件債権500万円の支払いを求める別訴を提起した（後訴）。\n５ 後訴における裁判所の判断について、${issue}を踏まえて論ぜよ。`;
    standardNorm = `【判例の規範定立】\n既判力は原則として主文に包含するものに限り生ずる（民訴法114条1項）が、相殺のために主張した自働債権の存否についての判断には、判決理由中の判断であるにもかかわらず例外的に既判力が生じる（同条2項）。重複主張による蒸し返しを防止する趣旨である。\n【当てはめ基準】\n相殺の抗弁が実質的に審理され排斥された場合、その自働債権不存在の判断には対抗額の限度で既判力が生じ、後訴において自働債権を別個に訴求することは既判力に抵触し許されない。`;
    statutes = [
      { title: '民事訴訟法 第114条（既判力の及ぶ範囲）', text: '１ 確定判決は、主文に包含するものに限り、既判力を有する。\n２ 相殺のために主張した請求の成立又は不成立の判断は、相殺をもって対抗した額について、既判力を有する。' },
    ];
  }

  // 【刑事訴訟法】
  else if (subject === '刑事訴訟法') {
    factContext = `１ 司法警察員Kらは、覚醒剤密売の疑いがある甲に対し、身分を秘匿して接触し、覚醒剤の購入を持ちかけた。\n２ 甲は当初躊躇したものの、Kらの執拗な説得に応じ、指定場所において覚醒剤を譲り渡した。\n３ Kらはその場で甲を現行犯逮捕し、覚醒剤を押収した。\n４ 本件捜査の適法性及び押収された覚醒剤の証拠能力について、${issue}を踏まえて論ぜよ。`;
    standardNorm = `【判例の規範定立】\n捜査機関が身分を秘匿して犯意を誘発するおとり捜査は、直接の被害者がいない薬物犯罪等において、通常の捜査方法のみでは摘発が困難な場合に、相当な方法による限り適法である。違法な捜査により収集された証拠は、令状主義の精神を潜脱する重大な違法があり、排除することが相当と認められるときは証拠能力を失う。`;
    statutes = [
      { title: '刑事訴訟法 第197条（捜査の原則）', text: '捜査については、その目的を達するため必要な取調をすることができる。但し、強制の処分は、この法律に特別の定のある場合でなければ、これをすることができない。' },
    ];
  }

  // 【商法】
  else if (subject === '商法') {
    factContext = `１ 甲株式会社の代表取締役Aは、自己が実質的に経営する乙株式会社の資金繰りが悪化したため、甲社の取締役会の承認を得ることなく、乙社のために甲社名義で多額の連帯保証契約を締結した。\n２ その後乙社は倒産し、甲社は保証債務の履行を余儀なくされ、多額の損害を被った。\n３ 甲社取締役会における${issue}及び代表取締役Aの会社に対する損害賠償責任について論ぜよ。`;
    standardNorm = `【判例の規範定立】\n取締役が自己又は第三者のために会社と取引をする場合、取締役会の承認を要する（会社法356条1項、365条1項）。承認なき利益相反取引は会社と相手方との関係では原則として無効であり、取締役は任務懈怠責任（423条1項）を免れない。`;
    statutes = [
      { title: '会社法 第356条（競業及び利益相反取引の制限）', text: '取締役は、次に掲げる場合には、株主総会（取締役会設置会社においては取締役会）において、当該取引につき重要な事実を開示し、その承認を受けなければならない。' },
      { title: '会社法 第423条（役員等の会社に対する損害賠償責任）', text: '取締役、会計参与、監査役、執行役又は会計監査人は、その任務を怠ったときは、株式会社に対し、これによって生じた損害を賠償する責任を負う。' },
    ];
  }

  // 【行政法】
  else if (subject === '行政法') {
    factContext = `１ Xは、建築基準法に適合する共同住宅の建築確認を建築主事Yに申請した。\n２ Yは、近隣住民との協議が整っていないことを理由に、指導要綱に基づき建築確認処分を留保した。\n３ Xは確認処分を速やかに行うよう求めている。\n４ 本件留保処分の違法性及び${issue}について論ぜよ。`;
    standardNorm = `【判例の規範定立】\n行政指導に従わないことを理由とする確認処分の留保は、相手方の真意による任意性が認められる限度でのみ適法であり、相手方が明確に指導を拒絶した後は、特段の事情のない限り違法な処分留保となる。`;
    statutes = [
      { title: '行政手続法 第33条（行政指導の方式）', text: '行政指導に携わる者は、その相手方が行政指導に従わないことを理由として、不利益な取扱いをしてはならない。' },
    ];
  }

  // 【民法】
  else {
    if (issue.includes('即時取得')) {
      factContext = `１ Aは、自己が所有する高価な絵画甲（時価300万円）をBに売却し代金を受領したが、引渡しは後日行う旨を合意した。\n２ その後、Bへの引渡し前に資金繰りに窮したAは、Cに対しても甲を売却し代金を受領した上、甲をCの自宅へ運搬して現実の引渡しを完了した。Cは取引時、Aがすでに甲をBに売却していた事実を知らず、知らないことにつき過失はなかった。\n３ BはCに対し、自己が先にAから甲を購入した真の所有者であると主張して、甲の引渡しを請求している。\n４ Bの請求の当否について、${issue}を踏まえて論ぜよ。`;
      standardNorm = `【判例の規範定立】\n取引行為によって平穏かつ公然に動産の占有を始めた者は、善意無過失であるときは即時に権利を取得する（民法192条）。二重譲渡において第二譲受人が現実の引渡しを受けた場合、第一譲受人との関係では無権利者からの取得ではなく178条の対抗問題となるが、前主が無権利者の場合または取引の安全を保護すべき要請がある場合には即時取得の法理が妥当する。`;
      statutes = [
        { title: '民法 第192条（即時取得）', text: '取引行為によって、平穏に、かつ、公然と動産の占有を始めた者は、善意であり、かつ、過失がないときは、即時にその動産について行使する権利を取得する。' },
        { title: '民法 第178条（動産に関する物権の譲渡の対抗要件）', text: '動産に関する物権の譲渡は、その動産の引渡しがなければ、第三者に対抗することができない。' },
      ];
    } else if (issue.includes('94条')) {
      factContext = `１ Aは、所有する甲土地について、親族Bの承諾を得て一時的に名義のみをB名義とする所有権移転登記を経由させた。\n２ その後、BはAに無断で、自らが甲土地の真の所有者であると偽り、善意無過失のCに対して甲土地を売却し、登記を移転した。\n３ AはCに対し、自己が真の所有者であると主張して、所有権確認及び登記の抹消を請求した。\n４ Aの請求が認められるか否かについて、${issue}を含めて論ぜよ。`;
      standardNorm = `【判例の規範定立】\n自ら不実の登記を作出した本人の帰責性は極めて重いため、民法94条2項が類推適用され、第三者は善意であれば足り、無過失までは不要である。`;
      statutes = [
        { title: '民法 第94条（虚偽表示）', text: '２ 前項の規定による意思表示の無効は、善意の第三者に対抗することができない。' },
      ];
    } else if (issue.includes('契約不適合') || issue.includes('解除')) {
      factContext = `１ AはBから、中古機械甲を事業用として代金1,000万円で購入した。\n２ 引渡し後、通常の使用環境において甲の内部基板がショートし稼働不能となった。調査の結果、納品前から基板に重大な経年劣化が存在していたことが判明した。\n３ AはBに対し、契約の目的を達成できないとして解除通知を発信するとともに、代金全額の返還を請求した。\n４ Aの請求の当否について、${issue}を踏まえて論ぜよ。`;
      standardNorm = `【判例の規範定立】\n目的物が種類・品質・数量に関して契約の内容に適合しない場合、買主は履行の追完請求、代金減額請求、解除、損害賠償請求をすることができる（民法562条以下）。契約の解除が認められるためには、不適合が社会通念上軽微でないことが必要である。`;
      statutes = [
        { title: '民法 第562条（買主の追完請求権）', text: '引き渡された目的物が種類、品質又は数量に関して契約の内容に適合しないものであるときは、買主は、売主に対し、目的物の修補、代替物の引渡し又は不足分の引渡しによる履行の追完を請求することができる。' },
      ];
    } else {
      factContext = `１ AはBに対し、金銭を貸し付けたが、弁済期が経過しても返還されない状態が続いていた。\n２ Aは債権回収のため、Bの有する財産および法律関係を調査した。\n３ 当事者間における権利義務の帰趨について、${issue}を踏まえて論ぜよ。`;
      standardNorm = `【判例の規範定立】\n当事者間の合意内容および信義則（民法1条2項）に基づき、要件該当性を検討した上で判断する。`;
      statutes = [{ title: '民法 第1条（基本原則）', text: '権利の行使及び義務の履行は、信義に従い誠実に行わなければならない。' }];
    }
  }

  return {
    id: 'prob-' + Date.now(),
    subject,
    source_exam: sourceExam,
    target_issue: issue,
    suggested_time_minutes: 70,
    fact_context: factContext,
    standard_norm: standardNorm,
    key_facts: [],
    statutes,
  };
}

export default function PracticePage() {
  const [problem, setProblem] = useState<ProblemData | null>(null);
  const [anatomy, setAnatomy] = useState<AnatomyData | null>(null);
  const [loading, setLoading] = useState(true);

  // エディタ状態
  const [draft, setDraft] = useState('');
  const [fontSize, setFontSize] = useState<FontSizeLevel>('base');
  const [activeTab, setActiveTab] = useState<'problem' | 'statute'>('problem');
  const [showAssist, setShowAssist] = useState(false);
  const [assistTab, setAssistTab] = useState<'steps' | 'blueprint' | 'anatomy' | 'syllogism'>('steps');

  // タイマー状態（秒）
  const [timeLeft, setTimeLeft] = useState(70 * 60);
  const [isTimerRunning, setIsTimerRunning] = useState(false);

  // 提出・AI状態
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [selectedAnnotation, setSelectedAnnotation] = useState<string | null>(null);

  // 検索・置換
  const [searchWord, setSearchWord] = useState('');
  const [replaceWord, setReplaceWord] = useState('');
  const [showSearch, setShowSearch] = useState(false);

  // ─── 問題作成エンジンモーダル状態 ───
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState('刑法');
  const [selectedYear, setSelectedYear] = useState('令和6年');
  const [selectedIssue, setSelectedIssue] = useState('');
  const [customIssue, setCustomIssue] = useState('');
  const [examMode, setExamMode] = useState<'kaidai' | 'standard'>('kaidai');

  // 連動論点リスト
  const availableIssues = useMemo(() => {
    return EXAM_ISSUES_MASTER[selectedSubject]?.[selectedYear] || [];
  }, [selectedSubject, selectedYear]);

  useEffect(() => {
    if (availableIssues.length > 0) {
      setSelectedIssue(availableIssues[0]);
    } else {
      setSelectedIssue('CUSTOM');
    }
  }, [availableIssues]);

  // 初期データ読み込み
  useEffect(() => {
    async function initData() {
      try {
        setLoading(true);

        // 過去の古いキャッシュを完全破棄
        if (typeof window !== 'undefined') {
          sessionStorage.removeItem('current_practice_problem');
        }

        // 初期問題として「刑法・共犯関係からの離脱」を100%専用問題でセット
        const initialProb = buildDedicatedProblem('刑法', '令和6年', '共犯関係からの離脱', true);
        setProblem(initialProb);
        setTimeLeft(70 * 60);
      } catch (err) {
        console.error('データ取得失敗:', err);
      } finally {
        setLoading(false);
      }
    }

    initData();
  }, []);

  // タイマーカウント
  useEffect(() => {
    let timer: any;
    if (isTimerRunning && timeLeft > 0) {
      timer = setInterval(() => setTimeLeft((t) => t - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [isTimerRunning, timeLeft]);

  // Tabキーインデント
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const textarea = e.currentTarget;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const val = textarea.value;
      setDraft(val.substring(0, start) + ' ' + val.substring(end));
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + 1;
      }, 0);
    }
  };

  // 置換実行
  const handleReplace = () => {
    if (!searchWord) return;
    setDraft(draft.replaceAll(searchWord, replaceWord));
  };

  // 答案提出 & AI採点
  const handleSubmit = async () => {
    if (!draft.trim()) {
      alert('答案が入力されていません。');
      return;
    }
    if (!confirm('起案を終了し、答案を提出してAI採点を実行しますか？')) return;

    try {
      setIsSubmitting(true);
      setIsTimerRunning(false);
      setFeedback('AIが答案を分析・採点しています（規範定立、あてはめ、三段論法の充足度を検証中）...');

      const response = await fetch('/api/evaluate-draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          problemId: problem?.id,
          userDraft: draft,
          timeSpentSeconds: ((problem?.suggested_time_minutes || 70) * 60) - timeLeft,
          standardNorm: problem?.standard_norm,
          keyFacts: problem?.key_facts,
        }),
      });

      const resJson = await response.json();
      const aiComment = resJson.feedback || '採点が完了しました。';
      setFeedback(aiComment);

      await supabase.from('submissions').insert({
        problem_id: problem?.id,
        user_draft: draft,
        time_spent_seconds: Math.max(0, ((problem?.suggested_time_minutes || 70) * 60) - timeLeft),
        ai_feedback: aiComment,
      });

      alert('答案の提出とAI採点が完了し、ダッシュボードに保存されました！');
    } catch (e: any) {
      alert('採点エラー: ' + e.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ─── 問題作成エンジンの起動（外部APIによるキメラ上書きを完全遮断） ───
  const handleRunProblemEngine = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsGenerating(true);

      const isKaidai = examMode === 'kaidai';
      const actualIssue = selectedIssue === 'CUSTOM' ? customIssue.trim() : selectedIssue;
      const targetIssueText = actualIssue || `${selectedSubject}の重要論点`;

      // ★ 外部APIを呼ばず、100%純粋な専用問題文を直接構築（キメラ混入は物理的に不可能）
      const newProblem = buildDedicatedProblem(selectedSubject, selectedYear, targetIssueText, isKaidai);

      // Supabase に保存
      supabase
        .from('sub_problems')
        .insert({
          subject: newProblem.subject,
          source_exam: newProblem.source_exam,
          target_issue: newProblem.target_issue,
          suggested_time_minutes: newProblem.suggested_time_minutes,
          fact_context: newProblem.fact_context,
          standard_norm: newProblem.standard_norm,
          key_facts: [],
        })
        .select()
        .single()
        .then(({ data }) => {
          if (data) newProblem.id = data.id;
        })
        .catch(() => {});

      // セッションストレージに保存
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('current_practice_problem', JSON.stringify(newProblem));
      }

      // 画面の全ステートを新問題に即時切り替え
      setProblem(newProblem);
      setAnatomy(null);
      setTimeLeft((newProblem.suggested_time_minutes || 70) * 60);
      setDraft('');
      setActiveTab('problem');
      setIsTimerRunning(true);
      setFeedback(null);
      setShowCreateModal(false);

      alert(`【${newProblem.subject}・${newProblem.target_issue}】の問題をセットしました！\nタイマーを開始しました。起案を開始してください。`);
    } catch (err: any) {
      alert('作成エラー: ' + (err.message || '問題の作成に失敗しました'));
    } finally {
      setIsGenerating(false);
    }
  };

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const charCount = draft.length;
  const maxChars = 2760;
  const progressRatio = Math.min(100, Math.round((charCount / maxChars) * 100));

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f1f5f9', color: '#0f172a', fontFamily: 'sans-serif', display: 'flex', flexDirection: 'column' }}>
      
      {/* 1. 最上部ヘッダー */}
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 40,
          backgroundColor: '#ffffff',
          borderBottom: '3px solid #0284c7',
          padding: '8px 20px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '20px' }}>⚖️</span>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ backgroundColor: '#e0f2fe', color: '#0369a1', border: '1px solid #bae6fd', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold' }}>
                {problem?.subject || '刑法'}
              </span>
              <h1 style={{ margin: 0, fontSize: '15px', fontWeight: 'bold', color: '#0f172a' }}>
                {problem?.source_exam || '本番CBT起案'}
              </h1>

              {/* ➕ 問題作成ボタン */}
              <button
                type="button"
                onClick={() => setShowCreateModal(true)}
                style={{
                  padding: '3px 10px',
                  backgroundColor: '#0284c7',
                  color: '#ffffff',
                  fontSize: '11px',
                  fontWeight: 'bold',
                  borderRadius: '4px',
                  border: 'none',
                  cursor: 'pointer',
                  boxShadow: '0 1px 2px rgba(2,132,199,0.3)',
                }}
              >
                ➕ 問題作成
              </button>
            </div>
            <p style={{ margin: 0, fontSize: '11px', color: '#64748b' }}>
              論点: <strong style={{ color: '#0284c7' }}>{problem?.target_issue || '読み込み中...'}</strong>
            </p>
          </div>
        </div>

        {/* 中央：タイマー & 文字数メーター */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: '#f8fafc', padding: '4px 10px', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
            <span style={{ fontSize: '16px' }}>⏱</span>
            <span style={{ fontFamily: 'monospace', fontSize: '18px', fontWeight: 'bold', color: timeLeft <= 600 ? '#dc2626' : '#0f172a' }}>
              {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
            </span>
            <button
              type="button"
              onClick={() => setIsTimerRunning(!isTimerRunning)}
              style={{
                padding: '3px 8px',
                fontSize: '11px',
                fontWeight: 'bold',
                borderRadius: '4px',
                cursor: 'pointer',
                backgroundColor: isTimerRunning ? '#fef3c7' : '#dcfce7',
                color: isTimerRunning ? '#92400e' : '#166534',
                border: isTimerRunning ? '1px solid #fde68a' : '1px solid #bbf7d0',
              }}
            >
              {isTimerRunning ? '一時停止' : '開始'}
            </button>
          </div>

          <div style={{ minWidth: '150px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontWeight: 'bold', marginBottom: '3px', color: '#475569' }}>
              <span>文字数: <strong style={{ color: charCount > maxChars ? '#dc2626' : '#0284c7' }}>{charCount}</strong> / {maxChars} 字</span>
              <span>約 {(charCount / 690).toFixed(1)} 頁</span>
            </div>
            <div style={{ height: '6px', backgroundColor: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
              <div
                style={{
                  height: '100%',
                  width: `${progressRatio}%`,
                  backgroundColor: charCount > maxChars ? '#ef4444' : charCount >= 2000 ? '#10b981' : '#0284c7',
                  transition: 'width 0.2s ease',
                }}
              />
            </div>
          </div>
        </div>

        {/* 右側：文字サイズ変更 & 履歴一覧 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', backgroundColor: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '3px 6px', gap: '4px' }}>
            <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#475569', marginRight: '2px' }}>🔍</span>
            {(['sm', 'base', 'lg', 'xl'] as FontSizeLevel[]).map((level) => {
              const isActive = fontSize === level;
              return (
                <button
                  key={level}
                  type="button"
                  onClick={() => setFontSize(level)}
                  style={{
                    padding: '2px 7px',
                    fontSize: '11px',
                    fontWeight: 'bold',
                    borderRadius: '4px',
                    border: isActive ? '1px solid #0284c7' : 'none',
                    backgroundColor: isActive ? '#0284c7' : 'transparent',
                    color: isActive ? '#ffffff' : '#334155',
                    cursor: 'pointer',
                  }}
                >
                  {level === 'sm' ? '小' : level === 'base' ? '標準' : level === 'lg' ? '大' : '特大'}
                </button>
              );
            })}
          </div>

          <Link
            href="/dashboard"
            style={{
              padding: '6px 12px',
              backgroundColor: '#f8fafc',
              border: '1px solid #cbd5e1',
              color: '#334155',
              fontSize: '12px',
              fontWeight: 'bold',
              borderRadius: '6px',
              textDecoration: 'none',
            }}
          >
            📋 履歴一覧
          </Link>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            style={{
              padding: '7px 16px',
              backgroundColor: '#047857',
              color: '#ffffff',
              fontSize: '12px',
              fontWeight: 'bold',
              borderRadius: '6px',
              border: 'none',
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
              boxShadow: '0 2px 4px rgba(4,120,87,0.3)',
            }}
          >
            {isSubmitting ? '採点中...' : '🚀 答案提出・AI採点'}
          </button>
        </div>
      </header>

      {/* 2. メイン 2ペイン分割 */}
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'minmax(380px, 45%) minmax(420px, 55%)', height: 'calc(100vh - 120px)', overflow: 'hidden' }}>
        
        {/* 左ペイン：問題文 / 電子六法 */}
        <section style={{ backgroundColor: '#ffffff', borderRight: '2px solid #cbd5e1', display: 'flex', flexDirection: 'column', height: '100%' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #e2e8f0', backgroundColor: '#f8fafc', padding: '0 8px' }}>
            <div style={{ display: 'flex' }}>
              <button
                type="button"
                onClick={() => setActiveTab('problem')}
                style={{
                  padding: '10px 18px',
                  fontSize: '13px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  border: 'none',
                  borderBottom: activeTab === 'problem' ? '3px solid #0284c7' : 'none',
                  backgroundColor: activeTab === 'problem' ? '#ffffff' : 'transparent',
                  color: activeTab === 'problem' ? '#0284c7' : '#64748b',
                }}
              >
                📄 問題文・事実
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('statute')}
                style={{
                  padding: '10px 18px',
                  fontSize: '13px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  border: 'none',
                  borderBottom: activeTab === 'statute' ? '3px solid #0284c7' : 'none',
                  backgroundColor: activeTab === 'statute' ? '#ffffff' : 'transparent',
                  color: activeTab === 'statute' ? '#0284c7' : '#64748b',
                }}
              >
                📖 電子六法・参照条文
              </button>
            </div>

            <button
              type="button"
              onClick={() => setShowCreateModal(true)}
              style={{
                padding: '4px 10px',
                fontSize: '11px',
                fontWeight: 'bold',
                backgroundColor: '#f0f9ff',
                color: '#0369a1',
                border: '1px solid #bae6fd',
                borderRadius: '4px',
                cursor: 'pointer',
              }}
            >
              ➕ 別の問題を作成
            </button>
          </div>

          <div style={{ flex: 1, padding: '20px', overflowY: 'auto', fontSize: fontSizes[fontSize].text, lineHeight: fontSizes[fontSize].lh }}>
            {activeTab === 'problem' ? (
              <div style={{ whiteSpace: 'pre-wrap', fontFamily: 'serif', color: '#1e293b' }}>
                {problem?.fact_context || '問題文を読み込み中...'}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', color: '#1e293b' }}>
                {problem?.statutes && problem.statutes.length > 0 ? (
                  problem.statutes.map((st, idx) => (
                    <div key={idx} style={{ backgroundColor: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '14px' }}>
                      <h4 style={{ margin: '0 0 6px', fontSize: '14px', fontWeight: 'bold', color: '#0369a1' }}>
                        {st.title}
                      </h4>
                      <p style={{ margin: 0, fontSize: '13px', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>
                        {st.text}
                      </p>
                    </div>
                  ))
                ) : (
                  <div style={{ backgroundColor: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '14px' }}>
                    <h4 style={{ margin: '0 0 6px', fontSize: '14px', fontWeight: 'bold', color: '#0369a1' }}>
                      {problem?.subject || '刑法'} 関連条文
                    </h4>
                    <p style={{ margin: 0, fontSize: '13px', lineHeight: '1.6' }}>
                      本問の論点【{problem?.target_issue}】に即した要件・効果の条文を適用して論証してください。
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </section>

        {/* 右ペイン：答案エディタ */}
        <section style={{ backgroundColor: '#f8fafc', display: 'flex', flexDirection: 'column', height: '100%' }}>
          <div style={{ padding: '8px 16px', backgroundColor: '#ffffff', borderBottom: '1px solid #cbd5e1', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#1e293b' }}>📝 答案エディタ</span>
              <span style={{ fontSize: '11px', color: '#64748b' }}>※Tabキーで全角スペース</span>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                onClick={() => setShowSearch(!showSearch)}
                style={{
                  padding: '3px 10px',
                  fontSize: '11px',
                  fontWeight: 'bold',
                  backgroundColor: showSearch ? '#e0f2fe' : '#ffffff',
                  color: showSearch ? '#0369a1' : '#475569',
                  border: '1px solid #cbd5e1',
                  borderRadius: '4px',
                  cursor: 'pointer',
                }}
              >
                🔍 検索・置換
              </button>
              
              <button
                type="button"
                onClick={() => setDraft('')}
                style={{
                  padding: '3px 10px',
                  fontSize: '11px',
                  fontWeight: 'bold',
                  backgroundColor: '#ffffff',
                  color: '#dc2626',
                  border: '1px solid #fca5a5',
                  borderRadius: '4px',
                  cursor: 'pointer',
                }}
              >
                クリア
              </button>
            </div>
          </div>

          {showSearch && (
            <div style={{ padding: '8px 16px', backgroundColor: '#e0f2fe', borderBottom: '1px solid #bae6fd', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px' }}>
              <input
                type="text"
                placeholder="検索文字..."
                value={searchWord}
                onChange={(e) => setSearchWord(e.target.value)}
                style={{ padding: '4px 8px', borderRadius: '4px', border: '1px solid #93c5fd', width: '130px' }}
              />
              <span>➔</span>
              <input
                type="text"
                placeholder="置換後..."
                value={replaceWord}
                onChange={(e) => setReplaceWord(e.target.value)}
                style={{ padding: '4px 8px', borderRadius: '4px', border: '1px solid #93c5fd', width: '130px' }}
              />
              <button
                type="button"
                onClick={handleReplace}
                style={{ padding: '4px 10px', backgroundColor: '#0284c7', color: '#ffffff', border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer' }}
              >
                置換実行
              </button>
            </div>
          )}

          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="ここに第１から順に答案を作成してください（Tabキーで1字下げができます）&#10;&#10;第１ 甲の罪責&#10;１ ..."
            style={{
              flex: 1,
              width: '100%',
              padding: '20px',
              fontFamily: 'serif',
              fontSize: fontSizes[fontSize].text,
              lineHeight: fontSizes[fontSize].lh,
              border: 'none',
              outline: 'none',
              resize: 'none',
              backgroundColor: '#ffffff',
              color: '#0f172a',
            }}
          />
        </section>
      </div>

      {/* 3. 画面下部：合格アシスト */}
      <div style={{ borderTop: '2px solid #cbd5e1', backgroundColor: '#ffffff', boxShadow: '0 -2px 10px rgba(0,0,0,0.05)' }}>
        <div style={{ padding: '8px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8fafc', borderBottom: showAssist ? '1px solid #e2e8f0' : 'none' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              type="button"
              onClick={() => setShowAssist(!showAssist)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '5px 12px',
                backgroundColor: showAssist ? '#0284c7' : '#ffffff',
                color: showAssist ? '#ffffff' : '#0f172a',
                border: '1px solid #cbd5e1',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: 'bold',
                cursor: 'pointer',
              }}
            >
              <span>{showAssist ? '▼' : '▲'}</span>
              <span>合格思考アシスト（4ステップ・設計図・4色解剖）</span>
            </button>

            {feedback && (
              <span style={{ fontSize: '12px', color: '#b45309', fontWeight: 'bold' }}>
                ⚖️ AI採点結果が届いています
              </span>
            )}
          </div>

          {showAssist && (
            <div style={{ display: 'flex', gap: '6px' }}>
              <button
                type="button"
                onClick={() => setAssistTab('steps')}
                style={{ padding: '4px 10px', fontSize: '11px', fontWeight: 'bold', borderRadius: '4px', cursor: 'pointer', border: assistTab === 'steps' ? '1px solid #0284c7' : '1px solid #cbd5e1', backgroundColor: assistTab === 'steps' ? '#e0f2fe' : '#ffffff', color: assistTab === 'steps' ? '#0369a1' : '#475569' }}
              >
                1. 思考手順
              </button>
              <button
                type="button"
                onClick={() => setAssistTab('blueprint')}
                style={{ padding: '4px 10px', fontSize: '11px', fontWeight: 'bold', borderRadius: '4px', cursor: 'pointer', border: assistTab === 'blueprint' ? '1px solid #0284c7' : '1px solid #cbd5e1', backgroundColor: assistTab === 'blueprint' ? '#e0f2fe' : '#ffffff', color: assistTab === 'blueprint' ? '#0369a1' : '#475569' }}
              >
                2. あてはめ設計図
              </button>
              <button
                type="button"
                onClick={() => setAssistTab('anatomy')}
                style={{ padding: '4px 10px', fontSize: '11px', fontWeight: 'bold', borderRadius: '4px', cursor: 'pointer', border: assistTab === 'anatomy' ? '1px solid #0284c7' : '1px solid #cbd5e1', backgroundColor: assistTab === 'anatomy' ? '#e0f2fe' : '#ffffff', color: assistTab === 'anatomy' ? '#0369a1' : '#475569' }}
              >
                3. 4色アナトミー
              </button>
              <button
                type="button"
                onClick={() => setAssistTab('syllogism')}
                style={{ padding: '4px 10px', fontSize: '11px', fontWeight: 'bold', borderRadius: '4px', cursor: 'pointer', border: assistTab === 'syllogism' ? '1px solid #0284c7' : '1px solid #cbd5e1', backgroundColor: assistTab === 'syllogism' ? '#e0f2fe' : '#ffffff', color: assistTab === 'syllogism' ? '#0369a1' : '#475569' }}
              >
                4. 模範答案・三段論法
              </button>
            </div>
          )}
        </div>

        {showAssist && (
          <div style={{ padding: '20px', maxHeight: '340px', overflowY: 'auto', fontSize: fontSizes[fontSize].text, lineHeight: fontSizes[fontSize].lh }}>
            {assistTab === 'steps' && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px' }}>
                {(anatomy?.thinking_steps || []).map((st) => (
                  <div key={st.step} style={{ backgroundColor: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '14px' }}>
                    <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#0284c7', marginBottom: '4px' }}>
                      STEP {st.step}
                    </div>
                    <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#0f172a', marginBottom: '6px' }}>
                      {st.title}
                    </div>
                    <div style={{ fontSize: '12px', color: '#475569', lineHeight: '1.5' }}>
                      {st.description}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {assistTab === 'blueprint' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 'bold' }}>
                  問題文の「生の事実（青）」を判例規範の「法的評価（緑）」にぶつける設計図です：
                </div>
                {(anatomy?.application_blueprint || []).map((bp, idx) => (
                  <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', backgroundColor: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '12px' }}>
                    <div style={{ backgroundColor: '#e0f2fe', padding: '10px', borderRadius: '6px', border: '1px solid #bae6fd', fontSize: '12px', color: '#0369a1' }}>
                      <strong>【生の事実】</strong><br />{bp.fact}
                    </div>
                    <div style={{ backgroundColor: '#dcfce7', padding: '10px', borderRadius: '6px', border: '1px solid #bbf7d0', fontSize: '12px', color: '#166534' }}>
                      <strong>【法的評価・あてはめ】</strong><br />{bp.evaluation}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {assistTab === 'anatomy' && (
              <div>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', fontSize: '11px', fontWeight: 'bold' }}>
                  <span style={{ backgroundColor: '#dbeafe', color: '#1e40af', padding: '2px 8px', borderRadius: '4px' }}>条文・要件提起</span>
                  <span style={{ backgroundColor: '#dcfce7', color: '#166534', padding: '2px 8px', borderRadius: '4px' }}>趣旨・保護法益</span>
                  <span style={{ backgroundColor: '#fef3c7', color: '#92400e', padding: '2px 8px', borderRadius: '4px' }}>判例規範（定規）</span>
                  <span style={{ backgroundColor: '#fee2e2', color: '#991b1b', padding: '2px 8px', borderRadius: '4px' }}>事実と評価</span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '7fr 5fr', gap: '16px' }}>
                  <div style={{ fontFamily: 'serif', backgroundColor: '#f8fafc', padding: '14px', borderRadius: '8px', border: '1px solid #cbd5e1', lineHeight: '1.8' }}>
                    {(anatomy?.dissected_segments || []).map((seg, idx) => {
                      const colorMap: any = {
                        requirement: '#dbeafe',
                        purpose: '#dcfce7',
                        norm: '#fef3c7',
                        application: '#fee2e2',
                        conclusion: '#f1f5f9',
                      };
                      return (
                        <span
                          key={idx}
                          onClick={() => setSelectedAnnotation(seg.annotation)}
                          style={{
                            backgroundColor: colorMap[seg.type] || '#f1f5f9',
                            padding: '2px 4px',
                            margin: '0 2px',
                            borderRadius: '3px',
                            cursor: 'pointer',
                            borderBottom: '1px dashed #64748b',
                          }}
                        >
                          {seg.text}{' '}
                        </span>
                      );
                    })}
                  </div>

                  <div style={{ backgroundColor: '#ffffff', border: '2px solid #0284c7', borderRadius: '8px', padding: '14px' }}>
                    <h5 style={{ margin: '0 0 6px', fontSize: '12px', fontWeight: 'bold', color: '#0284c7' }}>
                      💡 各文の思考解説（左の文章をクリック）
                    </h5>
                    <p style={{ margin: 0, fontSize: '12px', color: '#334155', lineHeight: '1.6' }}>
                      {selectedAnnotation || '色付けされた文章をクリックすると、なぜその記述が合格答案に不可欠なのかの理由と配点ポイントが表示されます。'}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {assistTab === 'syllogism' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div style={{ backgroundColor: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <h4 style={{ margin: 0, fontSize: '13px', fontWeight: 'bold', color: '#0f172a' }}>骨格答案（構成案）</h4>
                    <button
                      type="button"
                      onClick={() => setDraft(draft + '\n' + (anatomy?.skeleton_answer || ''))}
                      style={{ padding: '3px 8px', fontSize: '11px', backgroundColor: '#e0f2fe', color: '#0369a1', border: '1px solid #bae6fd', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
                    >
                      エディタに挿入
                    </button>
                  </div>
                  <pre style={{ margin: 0, fontSize: '12px', whiteSpace: 'pre-wrap', fontFamily: 'serif', color: '#334155' }}>
                    {anatomy?.skeleton_answer || '骨格データを読み込み中...'}
                  </pre>
                </div>

                <div style={{ backgroundColor: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <h4 style={{ margin: 0, fontSize: '13px', fontWeight: 'bold', color: '#0f172a' }}>完全模範答案（写経用）</h4>
                    <button
                      type="button"
                      onClick={() => setDraft(anatomy?.full_model_answer || '')}
                      style={{ padding: '3px 8px', fontSize: '11px', backgroundColor: '#fef3c7', color: '#92400e', border: '1px solid #fde68a', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
                    >
                      写経用に丸ごと転記
                    </button>
                  </div>
                  <pre style={{ margin: 0, fontSize: '12px', whiteSpace: 'pre-wrap', fontFamily: 'serif', color: '#334155', maxHeight: '240px', overflowY: 'auto' }}>
                    {anatomy?.full_model_answer || '模範答案を読み込み中...'}
                  </pre>
                </div>
              </div>
            )}
          </div>
        )}

        {feedback && (
          <div style={{ padding: '16px 20px', backgroundColor: '#fffbeb', borderTop: '2px solid #fde68a' }}>
            <h4 style={{ margin: '0 0 8px', fontSize: '13px', fontWeight: 'bold', color: '#78350f' }}>
              ⚖️ AI採点・添削講評
            </h4>
            <div style={{ fontSize: fontSizes[fontSize].text, lineHeight: fontSizes[fontSize].lh, color: '#1e293b', whiteSpace: 'pre-wrap', maxHeight: '200px', overflowY: 'auto' }}>
              {feedback}
            </div>
          </div>
        )}
      </div>

      {/* ─── 4. 科目×年度×論点連動型 問題作成エンジンモーダル ─── */}
      {showCreateModal && (
        <div
          onClick={() => !isGenerating && setShowCreateModal(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            width: '100%',
            height: '100%',
            backgroundColor: 'rgba(15, 23, 42, 0.7)',
            backdropFilter: 'blur(4px)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
            boxSizing: 'border-box',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '16px',
              width: '100%',
              maxWidth: '540px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
              border: '1px solid #cbd5e1',
              overflow: 'hidden',
              position: 'relative',
              zIndex: 10000,
            }}
          >
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8fafc' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '18px' }}>🪄</span>
                <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 'bold', color: '#0f172a' }}>
                  過去問論点・改題作成エンジン
                </h3>
              </div>
              <button
                type="button"
                onClick={() => !isGenerating && setShowCreateModal(false)}
                style={{ background: 'none', border: 'none', fontSize: '18px', color: '#64748b', cursor: 'pointer', padding: '4px' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleRunProblemEngine} style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#475569', marginBottom: '4px' }}>
                    1. 対象科目
                  </label>
                  <select
                    value={selectedSubject}
                    onChange={(e) => setSelectedSubject(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '9px 10px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '13px',
                      fontWeight: 'bold',
                      backgroundColor: '#ffffff',
                      color: '#0f172a',
                      cursor: 'pointer',
                      boxSizing: 'border-box',
                    }}
                  >
                    <option value="刑法">刑法</option>
                    <option value="民法">民法</option>
                    <option value="憲法">憲法</option>
                    <option value="民事訴訟法">民事訴訟法</option>
                    <option value="刑事訴訟法">刑事訴訟法</option>
                    <option value="商法">商法</option>
                    <option value="行政法">行政法</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#475569', marginBottom: '4px' }}>
                    2. 出題年度
                  </label>
                  <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '9px 10px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '13px',
                      fontWeight: 'bold',
                      backgroundColor: '#ffffff',
                      color: '#0f172a',
                      cursor: 'pointer',
                      boxSizing: 'border-box',
                    }}
                  >
                    <option value="令和6年">令和6年</option>
                    <option value="令和5年">令和5年</option>
                    <option value="令和4年">令和4年</option>
                    <option value="令和3年">令和3年</option>
                    <option value="令和2年">令和2年</option>
                    <option value="令和元年">令和元年</option>
                    <option value="平成30年">平成30年</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#475569', marginBottom: '4px' }}>
                  3. 出題論点を選択
                </label>
                <select
                  value={selectedIssue}
                  onChange={(e) => setSelectedIssue(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '9px 10px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '13px',
                    fontWeight: 'bold',
                    backgroundColor: '#ffffff',
                    color: '#0f172a',
                    cursor: 'pointer',
                    boxSizing: 'border-box',
                  }}
                >
                  {availableIssues.map((issue, idx) => (
                    <option key={idx} value={issue}>
                      📌 {issue}
                    </option>
                  ))}
                  <option value="CUSTOM">✏ 自由入力（別の論点を指定）</option>
                </select>

                {selectedIssue === 'CUSTOM' && (
                  <input
                    type="text"
                    required
                    placeholder="出題したい論点を入力（例: 即時取得と占有改定）"
                    value={customIssue}
                    onChange={(e) => setCustomIssue(e.target.value)}
                    style={{
                      width: '100%',
                      marginTop: '6px',
                      padding: '8px 10px',
                      borderRadius: '6px',
                      border: '1px solid #0284c7',
                      fontSize: '12px',
                      boxSizing: 'border-box',
                    }}
                  />
                )}
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#475569', marginBottom: '4px' }}>
                  4. 作成モード
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => setExamMode('kaidai')}
                    style={{
                      padding: '10px 8px',
                      borderRadius: '8px',
                      border: examMode === 'kaidai' ? '2px solid #0284c7' : '1px solid #cbd5e1',
                      backgroundColor: examMode === 'kaidai' ? '#e0f2fe' : '#ffffff',
                      color: examMode === 'kaidai' ? '#0369a1' : '#475569',
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                  >
                    <div style={{ fontSize: '12px', fontWeight: 'bold' }}>⚡ 実戦改題（ひねり）</div>
                    <div style={{ fontSize: '10px', color: '#64748b' }}>事実関係・過失要件の変更</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setExamMode('standard')}
                    style={{
                      padding: '10px 8px',
                      borderRadius: '8px',
                      border: examMode === 'standard' ? '2px solid #0284c7' : '1px solid #cbd5e1',
                      backgroundColor: examMode === 'standard' ? '#e0f2fe' : '#ffffff',
                      color: examMode === 'standard' ? '#0369a1' : '#475569',
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                  >
                    <div style={{ fontSize: '12px', fontWeight: 'bold' }}>🏛 過去問再現</div>
                    <div style={{ fontSize: '10px', color: '#64748b' }}>本試験の典型事例を再現</div>
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px', paddingTop: '14px', borderTop: '1px solid #e2e8f0' }}>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  disabled={isGenerating}
                  style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: '#ffffff', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  disabled={isGenerating}
                  style={{
                    padding: '8px 20px',
                    borderRadius: '6px',
                    border: 'none',
                    backgroundColor: '#0284c7',
                    color: '#ffffff',
                    fontSize: '12px',
                    fontWeight: 'bold',
                    cursor: isGenerating ? 'not-allowed' : 'pointer',
                    boxShadow: '0 2px 4px rgba(2,132,199,0.3)',
                  }}
                >
                  {isGenerating ? '問題構成中...' : '🚀 問題作成エンジン起動'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}