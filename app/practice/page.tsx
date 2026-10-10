'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

// ==========================================
// 1. 型定義 ＆ マスターデータ
// ==========================================
type ProblemData = {
  id?: string;
  subject: string;
  source_exam: string;
  target_issue: string;
  suggested_time_minutes: number;
  fact_context: string;
  standard_norm: string;
  key_facts?: string[];
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

// ─── 完全整合 問題文生成コア ───
function createCleanProblem(subject: string, year: string, issue: string, isKaidai: boolean): ProblemData {
  const sourceExam = `${year} 予備試験${isKaidai ? '改題' : ''}`;

  // 【刑法】
  if (subject === '刑法') {
    if (issue.includes('離脱')) {
      return {
        subject,
        source_exam: sourceExam,
        target_issue: issue,
        suggested_time_minutes: 70,
        fact_context: `１ 甲は、知人乙から「Vが自宅に多額の現金を保管している。一緒に押し入って金を奪おう」と持ちかけられ、これを承諾した。甲と乙は、深夜にV宅に侵入し、Vを縛り上げて金庫から現金を奪う計画（以下「本件計画」という）を立てた。\n２ 犯行当日午前2時頃、甲と乙は目出し帽を着用し、バールを所持してV宅に赴いた。甲がV宅の勝手口の施錠をバールでこじ開け、甲と乙が屋内に足を踏み入れたところ、奥の寝室で物音に気づいたVが「誰だ！」と大声を上げて廊下に出てきた。\n３ 予期せぬVの出現に激しく動転した甲は、恐怖のあまり「やばい、人が起きてきた。俺はもうやめる、帰るぞ」と乙に小声で告げ、手に持っていたバールをその場に投げ捨てて勝手口から一人で外へ逃走した。\n４ 一方、その場に残った乙は逃走せず、大声を出すVに対して「騒ぐと殺すぞ」と脅迫し、Vの顔面を数回殴打して反抗を抑圧した上、金庫から現金300万円を強奪した。\n\n【設問】\n甲及び乙の罪責について、共犯関係からの離脱の成否を含めて論ぜよ。`,
        standard_norm: `【判例の規範定立】\n共謀共同正犯における共犯関係からの離脱が認められるためには、一部の共犯者が単に関与を中止するのみでは足りず、当初の共謀によって形成された「物理的・心理的因果性」を完全に遮断・解消したといえることが必要である。\n【当てはめ基準】\n①離脱の意思表示と他の共犯者の了承の有無、②実行着手前か着手後か、③着手後においては自己の関与により生じた危険性を積極的に除去・阻止したかを総合衡量して判断する。`,
        statutes: [
          { title: '刑法 第60条（共同正犯）', text: '二人以上共同して犯罪を実行した者は、すべて正犯とする。' },
          { title: '刑法 第236条（強盗）', text: '暴行又は脅迫を用いて他人の財物を強取した者は、強盗の罪とし、五年以上の有期懲役に処する。' },
        ],
      };
    }
    if (issue.includes('詐欺') || issue.includes('不法原因給付') || issue.includes('交付行為')) {
      return {
        subject,
        source_exam: sourceExam,
        target_issue: issue,
        suggested_time_minutes: 70,
        fact_context: `１ 甲は、知人Vが違法な薬物密売に関与していることを知り、これを奇貨としてVから金を騙し取ろうと企てた。\n２ 甲はVに対し、「警察が君の薬物密売ルートの内偵を進めている。私を通じて担当捜査官に工作資金100万円を渡せば、事件をもみ消すことができる」と虚偽の事実を告げた。\n３ Vはその言葉を信用し、捜査もみ消しの謝礼（賄賂）の原資として、自己が所持していた現金100万円を甲に手渡した。\n４ 甲は当初から工作等を行う意図はなく、受け取った100万円を即座に自己の遊興費に費消した。\n\n【設問】\n甲の罪責について、詐欺罪（刑法246条1項）における欺罔行為、錯誤、財物の交付行為の有無、および民法708条の不法原因給付と詐欺罪の成否を含めて論ぜよ。`,
        standard_norm: `【判例の規範定立】\n欺罔行為とは交付の判断の基礎となる重要事実を偽る行為をいう。給付原因が不法（民法708条）であっても、民事上の返還請求権の成否と刑法上の法益保護は別個であり、被害者の財物に対する事実上の所持それ自体が保護に値するため、詐欺罪は成立する。\n【当てはめ基準】\n①使途・受領意思の偽りと錯誤、②瑕疵ある意思に基づく交付行為の存在、③不法原因給付物に対する刑法上の要保護性を判断する。`,
        statutes: [
          { title: '刑法 第246条（詐欺）', text: '１ 人を欺いて財物を交付させた者は、十年以下の懲役に処する。' },
          { title: '民法 第708条（不法原因給付）', text: '不法な原因のために給付をした者は、その給付したものの返還を請求することができない。' },
        ],
      };
    }
    if (issue.includes('不能犯') || issue.includes('未遂犯')) {
      return {
        subject,
        source_exam: sourceExam,
        target_issue: issue,
        suggested_time_minutes: 70,
        fact_context: `１ 甲は、日頃から強い怨恨を抱いていた知人Vを毒殺しようと企図した。\n２ 甲は、猛毒の青酸カリを入手したつもりであったが、売人に騙されて渡された粉末は実際には人体に全く害のない硫黄粉末であった。甲はその事実を知らず、Vを確実に死亡させられる劇薬であると過信していた。\n３ 甲はVの自宅を訪れ、Vが席を外した隙を見計らい、Vの湯飲みに上記硫黄粉末5グラムを混入して攪拌した。その後、戻ってきたVはこれをすべて飲み干したが、体調に一切の異常は生じなかった。\n\n【設問】\n甲の罪責について、不能犯と未遂犯の区別基準を踏まえ、殺人未遂罪（刑法199条、203条）の成否を論ぜよ。`,
        standard_norm: `【判例の規範定立】\n未遂犯の処罰根拠は既遂結果発生の現実的危険性を惹起した点にある。したがって、不能犯と未遂犯の区別は、行為当時、一般人が認識し得た客観的事情及び行為者が特に認識していた事情を基礎とし、一般人の判断を基準として結果発生の具体的危険があったか否か（具体的危険説）によって決する。\n【当てはめ基準】\n①主観的事情（毒殺の強い犯意）、②客観的事情（混入物質が人体に無害な物質であったこと）、③当該行為が一般人の立場から見て死の具体的危険を有するかを総合考慮する。`,
        statutes: [
          { title: '刑法 第199条（殺人）', text: '人を殺した者は、死刑又は無期若しくは五年以上の懲役に処する。' },
          { title: '刑法 第203条（未遂罪）', text: '第百九十九条の罪の未遂は、罰する。' },
          { title: '刑法 第43条（未遂減軽）', text: '犯罪の実行に着手してこれを遂げなかった者は、その刑を減軽することができる。' },
        ],
      };
    }
    if (issue.includes('放火')) {
      return {
        subject,
        source_exam: sourceExam,
        target_issue: issue,
        suggested_time_minutes: 70,
        fact_context: `１ 甲は、Vに対する嫌がらせの目的で、深夜、V宅の庭に駐車されていたV所有の軽トラック（建造物以外）に放火することを決意した。\n２ 甲は軽トラックの荷台に積まれていた段ボール箱にライターで点火した。火は段ボール箱から軽トラックの荷台カバーへと燃え移り、炎が立ち上った。\n３ 付近を通りかかった警邏中の警察官がこれを発見し、備え付けの消火器で消火活動を行ったため、火は荷台の一部を炭化させた段階で鎮火した。\n\n【設問】\n甲の罪責について、建造物等以外放火罪（刑法110条1項）における「焼損」の意義および既遂時期、公共の危険の発生の有無を含めて論ぜよ。`,
        standard_norm: `【判例の規範定立】\n放火罪における「焼損」とは、火が媒介物を離れて目的物に燃え移り、独立して燃焼を継続しうる状態に達したことをいう（独立燃焼説）。建造物等以外放火罪の成立には「公共の危険」の発生を要する。`,
        statutes: [
          { title: '刑法 第110条（建造物等以外放火）', text: '放火して、前二条に規定する物以外の物を焼損し、よって公共の危険を生じさせた者は、一年以上十年以下の懲役に処する。' },
        ],
      };
    }
    // 刑法デフォルト
    return {
      subject,
      source_exam: sourceExam,
      target_issue: issue,
      suggested_time_minutes: 70,
      fact_context: `１ 甲は、乙と共謀して深夜の店舗Vに侵入し、金庫から現金を窃取することを計画した。\n２ 甲が見張りを行う中、乙が勝手口を損壊して店内に侵入し、金庫から売上金50万円を窃取した。\n３ その後、甲及び乙は待機させていた自動車に乗って逃走した。\n\n【設問】\n甲及び乙の罪責について、建造物侵入罪及び窃盗罪の共同正犯（刑法60条）の成立要件を含めて論ぜよ。`,
      standard_norm: `【判例の規範定立】\n共同正犯の成立要件は、①共謀（意思連絡）及び②共謀に基づく実行行為である。正犯意思および重要な役割の分担を通じて自己の犯罪を実現した点に処罰根拠がある。\n【当てはめ基準】\n①共謀の成否、②見張り行為の寄与度（物理的・心理的因果性）、③利得の分配等の正犯意思を総合考慮する。`,
      statutes: [{ title: '刑法 第60条（共同正犯）', text: '二人以上共同して犯罪を実行した者は、すべて正犯とする。' }],
    };
  }

  // 【行政法】
  if (subject === '行政法') {
    return {
      subject,
      source_exam: sourceExam,
      target_issue: issue,
      suggested_time_minutes: 70,
      fact_context: `１ Xは、建築基準法に適合する共同住宅の建築確認を建築主事Yに申請した。\n２ Yは、近隣住民との協議が整っていないことを理由に、指導要綱に基づき建築確認処分を留保した。\n３ Xは確認処分を速やかに行うよう求めている。\n\n【設問】\n本件留保処分の違法性及び行政処分性（行訴法3条2項）の判断枠組みについて論ぜよ。`,
      standard_norm: `【判例の規範定立】\n行政指導に従わないことを理由とする確認処分の留保は、相手方の任意性が認められる限度でのみ適法であり、相手方が明確に指導を拒絶した後は、特段の事情のない限り違法な処分留保となる（武蔵野市マンション事件）。行訴法3条2項の処分とは公権力の行使たる行為で直接国民の権利義務を形成・確定するものをいう。`,
      statutes: [
        { title: '行政手続法 第33条（行政指導の方式）', text: '行政指導に携わる者は、その相手方が行政指導に従わないことを理由として、不利益な取扱いをしてはならない。' },
        { title: '行政事件訴訟法 第3条（抗告訴訟）', text: '２ この法律において「処分の取消しの訴え」とは、行政庁の処分その他公権力の行使に当たる行為の取消しを求める訴訟をいう。' },
      ],
    };
  }

  // 【民法】
  if (subject === '民法') {
    if (issue.includes('即時取得')) {
      return {
        subject,
        source_exam: sourceExam,
        target_issue: issue,
        suggested_time_minutes: 70,
        fact_context: `１ Aは、自己所有の高価な絵画甲（時価300万円）をBに売却し代金を受領したが、引渡しは後日行う合意をした。\n２ その後、AはCに対しても甲を売却し代金を受領した上、甲をCの自宅へ運搬して現実の引渡しを完了した。Cは取引時、AがBに売却していた事実を知らず、過失もなかった。\n３ BはCに対し、自己が先に甲を購入した真の所有者であると主張して、甲の引渡しを請求している。\n\n【設問】\nBの請求の当否について、動産の二重譲渡と即時取得（民法192条）の成否を踏まえて論ぜよ。`,
        standard_norm: `【判例の規範定立】\n取引行為によって平穏かつ公然に動産の占有を始めた者は、善意無過失であるときは即時に権利を取得する（民法192条）。二重譲渡において第二譲受人が現実の引渡しを受けた場合、即時取得の法理が妥当する。`,
        statutes: [
          { title: '民法 第192条（即時取得）', text: '取引行為によって、平穏に、かつ、公然と動産の占有を始めた者は、善意であり、かつ、過失がないときは、即時にその動産について行使する権利を取得する。' },
        ],
      };
    }
    return {
      subject,
      source_exam: sourceExam,
      target_issue: issue,
      suggested_time_minutes: 70,
      fact_context: `１ Aは、所有する甲土地について、親族Bの承諾を得て一時的に名義のみをB名義とする所有権移転登記を経由させた。\n２ その後、BはAに無断で自らが甲土地の真の所有者であると偽り、善意無過失のCに対して甲土地を売却し、登記を移転した。\n３ AはCに対し、自己が真の所有者であると主張して登記の抹消を請求した。\n\n【設問】\nAの請求が認められるか否かについて、民法94条2項の類推適用の可否を含めて論ぜよ。`,
      standard_norm: `【判例の規範定立】\n自ら不実の登記を作出した本人の帰責性は極めて重いため、民法94条2項が類推適用され、第三者は善意であれば足り、無過失までは不要である。`,
      statutes: [{ title: '民法 第94条（虚偽表示）', text: '２ 前項の規定による意思表示の無効は、善意の第三者に対抗することができない。' }],
    };
  }

  // その他共通
  return {
    subject,
    source_exam: sourceExam,
    target_issue: issue,
    suggested_time_minutes: 70,
    fact_context: `１ 当事者間において所定の紛争が発生し、権利関係の確定が求められている。\n２ 判例の確立した枠組みに基づき、本問の事実関係を評価する必要がある。\n\n【設問】\n各当事者の請求又は罪責について、${issue}を踏まえて論ぜよ。`,
    standard_norm: `【判例の規範定立】\n確立した判例規範に基づき、生の事実を総合評価して判断する。`,
    statutes: [],
  };
}

// 🌟 動的アナトミー構築エンジン
function buildAnatomyFromProblem(problem: ProblemData): AnatomyData {
  const norm = problem.standard_norm || '判例の規範定立および当てはめ基準';
  const issue = problem.target_issue || '重要論点';

  return {
    pass_reason_summary: `${issue}について、条文上の要件を確定し、確立した判例の規範を定立した上で、問題文の生の事実を過不足なくあてはめて論証する。`,
    statutory_framework: problem.statutes && problem.statutes[0] ? problem.statutes[0].title : `${problem.subject} 関連条文`,
    skeleton_answer: `第１ ${issue}について\n１ 条文上の根拠及び要件の確認\n２ 判例規範の定立（法意・保護法益からの解釈）\n３ 事実のあてはめ（問題文記載の生の事実の法的評価）\n第２ 結論（罪責または法的請求の帰趨）`,
    full_model_answer: `第１ ${issue}について\n１ 条文の趣旨に照らし、本問における該当性を検討する。\n２ ${norm}\n３ 本件の具体的事実関係をみるに、当事者の客観的行動及び認識に照らし、上記規範の各考慮要素を充足する。\n４ したがって、要件該当性が認められる。`,
    syllogism_mapping: {
      major_premise: { issue: issue, norm: norm },
      minor_premise: { facts: ['問題文に記載された客観的事実'], evaluations: ['規範の考慮要素に合致する法的評価'] },
      conclusion: '結論を肯定（又は否定）する。',
    },
    thinking_steps: [
      { step: 1, title: '問題提起と条文の摘示', description: '適用すべき条文の番号を明記し、文言解釈・論点の所在を簡潔に示す。' },
      { step: 2, title: '趣旨に基づく判例規範定立', description: '条文の趣旨・保護法益から、本番答案に直結する判断枠組み（定規）を立てる。' },
      { step: 3, title: '生の事実の抽出と法的評価', description: '問題文の客観的事実・主観的認識を漏れなく拾い、規範の要件に当てはめる。' },
      { step: 4, title: '結論と罪数・請求の確定', description: 'あてはめ結果に基づき、罪責や法的効果を過不足なく論断する。' },
    ],
    application_blueprint: [
      { fact: '問題文に現れた当事者の具体的言動・客観的事実', evaluation: '規範の考慮要素に直結し、法的評価を基礎づける決定打となる事実。' },
    ],
    dissected_segments: [
      { type: 'requirement', text: `${issue}の成否について検討する。`, annotation: '【論点提起】条文要件と論点を明示。' },
      { type: 'norm', text: norm, annotation: '【判例規範定立】答案作成に直結する定規を提示。' },
      { type: 'application', text: '上記事実関係に現れた具体的事情を規範に照らして検討する。', annotation: '【事実のあてはめ】' },
      { type: 'conclusion', text: '以上の検討より、結論に至る。', annotation: '【結論】' },
    ],
  };
}

export default function PracticePage() {
  const initialProb = useMemo(() => createCleanProblem('刑法', '令和6年', '共犯関係からの離脱', true), []);

  const [problem, setProblem] = useState<ProblemData>(initialProb);
  const [anatomy, setAnatomy] = useState<AnatomyData>(buildAnatomyFromProblem(initialProb));

  // エディタ状態
  const [draft, setDraft] = useState('');
  const [fontSize, setFontSize] = useState<FontSizeLevel>('base');
  const [activeTab, setActiveTab] = useState<'problem' | 'statute'>('problem');
  const [showAssist, setShowAssist] = useState(true);
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

  // ─── モーダル状態 ───
  const [showCreateModal, setShowCreateModal] = useState(false);
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

  // 初期化：再起案データがあれば反映
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const retryDraft = sessionStorage.getItem('retry_draft');
      if (retryDraft) setDraft(retryDraft);
    }
  }, []);

  // タイマーカウント
  useEffect(() => {
    let timer: any;
    if (isTimerRunning && timeLeft > 0) {
      timer = setInterval(() => setTimeLeft((t) => t - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [isTimerRunning, timeLeft]);

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

      let targetProblemId = problem?.id;
      if (!targetProblemId) {
        const { data: newProb } = await supabase
          .from('sub_problems')
          .insert({
            subject: problem.subject,
            source_exam: problem.source_exam,
            target_issue: problem.target_issue,
            fact_context: problem.fact_context,
            standard_norm: problem.standard_norm,
            suggested_time_minutes: problem.suggested_time_minutes || 70,
            problem_type: 'clean_dedicated',
          })
          .select('id')
          .single();

        if (newProb?.id) {
          targetProblemId = newProb.id;
          setProblem((prev) => ({ ...prev, id: newProb.id }));
        }
      }

      await supabase.from('submissions').insert({
        problem_id: targetProblemId,
        user_draft: draft,
        time_spent_seconds: Math.max(0, ((problem?.suggested_time_minutes || 70) * 60) - timeLeft),
        ai_feedback: aiComment,
      });

      alert('答案の提出とAI採点が完了し、ダッシュボードに正常保存されました！');
    } catch (e: any) {
      alert('採点エラー: ' + e.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ─── 🚀 問題作成エンジン起動（即時レンダリング＆DB保存） ───
  const handleRunProblemEngine = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const isKaidai = examMode === 'kaidai';
      const actualIssue = selectedIssue === 'CUSTOM' ? customIssue.trim() : (selectedIssue || availableIssues[0] || '重要論点');

      // 完全整合した問題を即座に構築
      const newProblem = createCleanProblem(selectedSubject, selectedYear, actualIssue, isKaidai);

      // バックグラウンドでSupabaseに保存
      supabase
        .from('sub_problems')
        .insert({
          subject: newProblem.subject,
          source_exam: newProblem.source_exam,
          target_issue: newProblem.target_issue,
          suggested_time_minutes: newProblem.suggested_time_minutes,
          fact_context: newProblem.fact_context,
          standard_norm: newProblem.standard_norm,
          problem_type: 'clean_dedicated',
        })
        .select('id')
        .single()
        .then(({ data }) => {
          if (data?.id) newProblem.id = data.id;
        });

      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('retry_problem_id');
        sessionStorage.removeItem('retry_draft');
      }

      // 画面更新
      setProblem(newProblem);
      setAnatomy(buildAnatomyFromProblem(newProblem));
      setTimeLeft((newProblem.suggested_time_minutes || 70) * 60);
      setDraft('');
      setActiveTab('problem');
      setIsTimerRunning(true);
      setFeedback(null);
      setShowCreateModal(false);

      alert(`【${newProblem.subject}・${newProblem.target_issue}】の問題をセットしました！起案を開始してください。`);
    } catch (err: any) {
      alert('問題作成エラー: ' + err.message);
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
                {problem.subject}
              </span>
              <h1 style={{ margin: 0, fontSize: '15px', fontWeight: 'bold', color: '#0f172a' }}>
                {problem.source_exam}
              </h1>

              <button
                type="button"
                onClick={() => setShowCreateModal(true)}
                style={{
                  padding: '3px 10px',
                  backgroundColor: '#0284c7',
                  color: '#ffffff',
                  fontSize: '0.85em', fontWeight: 'bold', borderRadius: '4px',
                  border: 'none',
                  cursor: 'pointer',
                  boxShadow: '0 1px 2px rgba(2,132,199,0.3)',
                }}
              >
                ➕ 問題作成
              </button>
            </div>
            <p style={{ margin: 0, fontSize: '11px', color: '#64748b' }}>
              論点: <strong style={{ color: '#0284c7' }}>{problem.target_issue}</strong>
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
                fontSize: '0.85em', fontWeight: 'bold', borderRadius: '4px',
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
                    fontSize: '0.85em', fontWeight: 'bold', borderRadius: '4px',
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
                {problem.fact_context}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', color: '#1e293b' }}>
                {problem.statutes && problem.statutes.length > 0 ? (
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
                      {problem.subject} 関連条文
                    </h4>
                    <p style={{ margin: 0, fontSize: '13px', lineHeight: '1.6' }}>
                      本問の論点【{problem.target_issue}】に即した要件・効果の条文を適用して論証してください。
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
            placeholder="ここに第１から順に答案を作成してください（Tabキーで1字下げができます）&#10;&#10;第１ 甲の罪責について&#10;１ ..."
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
                style={{ padding: '4px 10px', fontSize: '0.85em', fontWeight: 'bold', borderRadius: '4px', cursor: 'pointer', border: assistTab === 'steps' ? '1px solid #0284c7' : '1px solid #cbd5e1', backgroundColor: assistTab === 'steps' ? '#e0f2fe' : '#ffffff', color: assistTab === 'steps' ? '#0369a1' : '#475569' }}
              >
                1. 思考手順
              </button>
              <button
                type="button"
                onClick={() => setAssistTab('blueprint')}
                style={{ padding: '4px 10px', fontSize: '0.85em', fontWeight: 'bold', borderRadius: '4px', cursor: 'pointer', border: assistTab === 'blueprint' ? '1px solid #0284c7' : '1px solid #cbd5e1', backgroundColor: assistTab === 'blueprint' ? '#e0f2fe' : '#ffffff', color: assistTab === 'blueprint' ? '#0369a1' : '#475569' }}
              >
                2. あてはめ設計図
              </button>
              <button
                type="button"
                onClick={() => setAssistTab('anatomy')}
                style={{ padding: '4px 10px', fontSize: '0.85em', fontWeight: 'bold', borderRadius: '4px', cursor: 'pointer', border: assistTab === 'anatomy' ? '1px solid #0284c7' : '1px solid #cbd5e1', backgroundColor: assistTab === 'anatomy' ? '#e0f2fe' : '#ffffff', color: assistTab === 'anatomy' ? '#0369a1' : '#475569' }}
              >
                3. 4色アナトミー
              </button>
              <button
                type="button"
                onClick={() => setAssistTab('syllogism')}
                style={{ padding: '4px 10px', fontSize: '0.85em', fontWeight: 'bold', borderRadius: '4px', cursor: 'pointer', border: assistTab === 'syllogism' ? '1px solid #0284c7' : '1px solid #cbd5e1', backgroundColor: assistTab === 'syllogism' ? '#e0f2fe' : '#ffffff', color: assistTab === 'syllogism' ? '#0369a1' : '#475569' }}
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
                    <div style={{ fontSize: '0.85em', fontWeight: 'bold', color: '#0284c7', marginBottom: '4px' }}>
                      STEP {st.step}
                    </div>
                    <div style={{ fontSize: '1.1em', fontWeight: 'bold', color: '#0f172a', marginBottom: '6px' }}>
                      {st.title}
                    </div>
                    <div style={{ fontSize: '0.95em', color: '#475569', lineHeight: '1.6' }}>
                      {st.description}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {assistTab === 'blueprint' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ fontSize: '0.95em', color: '#64748b', fontWeight: 'bold', marginBottom: '4px' }}>
                  問題文の「生の事実（青）」を判例規範の「法的評価（緑）」にぶつける設計図です：
                </div>
                {(anatomy?.application_blueprint || []).map((bp, idx) => (
                  <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', backgroundColor: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '12px' }}>
                    <div style={{ backgroundColor: '#e0f2fe', padding: '10px', borderRadius: '6px', border: '1px solid #bae6fd', fontSize: '0.95em', lineHeight: '1.6', color: '#0369a1' }}>
                      <strong>【生の事実】</strong><br />{bp.fact}
                    </div>
                    <div style={{ backgroundColor: '#dcfce7', padding: '10px', borderRadius: '6px', border: '1px solid #bbf7d0', fontSize: '0.95em', lineHeight: '1.6', color: '#166534' }}>
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
                  <div style={{
                    fontFamily: 'serif',
                    backgroundColor: '#f8fafc',
                    padding: '14px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '1em',
                    lineHeight: fontSizes[fontSize].lh,
                  }}>
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
                    <h4 style={{ margin: 0, fontSize: '1.1em', fontWeight: 'bold', color: '#0f172a' }}>骨格答案（構成案）</h4>
                    <button
                      type="button"
                      onClick={() => setDraft(draft + '\n' + (anatomy?.skeleton_answer || ''))}
                      style={{ padding: '3px 8px', fontSize: '11px', backgroundColor: '#e0f2fe', color: '#0369a1', border: '1px solid #bae6fd', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
                    >
                      エディタに挿入
                    </button>
                  </div>
                  <pre style={{
                    margin: 0,
                    fontSize: '1em',
                    lineHeight: fontSizes[fontSize].lh,
                    whiteSpace: 'pre-wrap',
                    fontFamily: 'serif',
                    color: '#334155',
                  }}>
                    {anatomy?.skeleton_answer || '骨格データを読み込み中...'}
                  </pre>
                </div>

                <div style={{ backgroundColor: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <h4 style={{ margin: 0, fontSize: '1.1em', fontWeight: 'bold', color: '#0f172a' }}>完全模範答案（写経用）</h4>
                    <button
                      type="button"
                      onClick={() => setDraft(anatomy?.full_model_answer || '')}
                      style={{ padding: '3px 8px', fontSize: '11px', backgroundColor: '#fef3c7', color: '#92400e', border: '1px solid #fde68a', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
                    >
                      写経用に丸ごと転記
                    </button>
                  </div>
                  <pre style={{
                    margin: 0,
                    fontSize: '1em',
                    lineHeight: fontSizes[fontSize].lh,
                    whiteSpace: 'pre-wrap',
                    fontFamily: 'serif',
                    color: '#334155',
                    maxHeight: fontSize === 'xl' ? '380px' : fontSize === 'lg' ? '300px' : '240px',
                    overflowY: 'auto',
                  }}>
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

      {/* ─── 4. 問題作成エンジンモーダル ─── */}
      {showCreateModal && (
        <div
          onClick={() => setShowCreateModal(false)}
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
                onClick={() => setShowCreateModal(false)}
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
                  style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: '#ffffff', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  style={{
                    padding: '8px 20px',
                    borderRadius: '6px',
                    border: 'none',
                    backgroundColor: '#0284c7',
                    color: '#ffffff',
                    fontSize: '12px',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    boxShadow: '0 2px 4px rgba(2,132,199,0.3)',
                  }}
                >
                  🚀 問題作成エンジン起動
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}