'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

// 全科目共通・考査委員の即死地雷チェック ＆ 思考フレームワーク定義
const SUBJECT_DRILL_GUIDES: Record<string, { title: string; fatalMistakes: string[]; logicFramework: string[]; template: string }> = {
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
      '④ 目的・手段の審査（目的の重大性・手段の必要最小限性・より緩やかな規制手段L-N-G-R）'
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
      '取締役会決議と株主総会決議の権限分配（362条、206条の2等）の混同',
      '特別利害関係取締役（369条2項）の該当性と退席・定足数の検討漏れ',
      '確定した役員報酬（361条1項）の一方的減額における個別同意要件の看過',
      '新株発行無効の訴え（828条1項2号）における瑕疵の重大性と取引の安全の比較衡量不足'
    ],
    logicFramework: [
      '① 意思決定手続の適法性（取締役会・株主総会の招集通知・定足数・議決要件）',
      '② 特別利害関係（忠実義務違反の蓋然性・個人の地位剥奪）',
      '③ 支配権移転新株発行（206条の2、主要目的ルール、通知送達の悪意）',
      '④ 訴訟手段の選択（新株発行無効の訴え、役員報酬差額請求等）'
    ],
    template: `第１ 設問１について\n１ 代表取締役解職決議の効力（会社法369条2項・特別利害関係）\n２ 役員報酬減額の有効性とAの請求（361条1項・具体的権利性）\n\n第２ 設問２について\n１ 新株発行無効の訴え（828条1項2号）の可否と無効事由（206条の2・招集通知瑕疵）`
  },
  '民事訴訟法': {
    title: '民訴法：訴訟物・自己利用文書・重複起訴・既判力',
    fatalMistakes: [
      '自己利用文書（220条4号ニ）を単に「社外秘だから」と結論付ける（作成目的・開示不利益を要検討）',
      '一部請求本訴係属中の反訴相殺における142条重複起訴の論証抜け',
      '既判力の客観的範囲（114条1項・2項）と争点効・信義則の混同',
      '処分権主義・弁論主義の第1・第2・第3テーゼの適用の誤り'
    ],
    logicFramework: [
      '① 訴訟物の特定と審判対象の画定（一部請求の許容性と残部請求）',
      '② 文書提出命令（220条4号ニ：作成目的・記載内容・開示による不利益の総合考慮）',
      '③ 反訴と相殺の抗弁（重複起訴禁止142条、二重審理・既判力抵触のおそれ、予備的抗弁の構成）'
    ],
    template: `第１ 設問１について（自己利用文書の該当性）\n１ 民事訴訟法220条4号ニの解釈規範\n２ 本件予測表の該当性（Yの反論とXの立論）\n\n第２ 設問２について（反訴における相殺の抗弁）\n１ 本訴未請求部分（2億円）の適法性\n２ 本訴請求部分（1億円）の適法性（142条類推適用の要否・併合審理の意義）`
  },
  '刑事訴訟法': {
    title: '刑訴法：強制処分・令状主義・伝聞法則・訴因変更',
    fatalMistakes: [
      '伝聞証拠（320条1項）の要証事実を誤って「非伝聞」を「伝聞」と判定する',
      '写真撮影報告書の電磁的記録の機械的正確性（原本性・同一性）の立証を抜かす',
      '訴因変更の限界（312条1項）で「基本的事実関係の同一性」の二段階基準を飛ばす',
      '客体の生死不明時における択一的認定と無罪推定（利益原則）の調和論証不足'
    ],
    logicFramework: [
      '① 捜査手続の適法性（任意捜査の限界・強制処分の法定主義・令状主義）',
      '② 証拠能力（伝聞法則320条：公判外供述・要証事実との関係・非伝聞［言語的行為］、321条例外）',
      '③ 訴因変更（312条1項：公訴事実の同一性、日時・場所・行為態様の共通性）',
      '④ 判決（択一的認定の許容性・実質的重なり合い・軽い罪の限度での処断）'
    ],
    template: `第１ 設問１について（予備的訴因追加の可否）\n１ 公訴事実の同一性（312条1項）の判断基準\n２ 本件への当てはめ（基本的事実関係の共通性）\n\n第２ 設問２について（客体の生死不明と択一的認定）\n１ 無罪推定の原則（疑わしきは被告人の利益に）\n２ 構成要件の実質的重なり合いと軽い罪の認定（刑法190条死体遺棄罪の成立）`
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
      '詐欺の故意で「積極事実」と「消極事実」を対比せずに単一方向のみ述べる',
      '客観的証拠（ICカード・領収書）による供述変遷・外堀の固定プロセスを看過する',
      '事件単位の原則に基づく「起訴後余罪取調べ受忍義務の否定」の条文根拠欠落',
      '詐欺の既遂時期（受領時）とコインロッカー回収役（A2）の承継的共同正犯の先後関係の誤認'
    ],
    logicFramework: [
      '① 犯人性・客観的証拠（ICカード・領収書等による否認供述弾劾）',
      '② 故意の事実認定（積極事実：高額報酬・架空身分・違法性疑念 vs 消極事実：気休め言葉・本名開示）',
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
    template: `第１ 設問１について（A社の法人税所得計算・法人税法22条）\n\n第２ 設問２について（所得の人的帰属・所得税法12条）\n１ 人的帰属の原則：\n２ Cの主張（法律的帰属説）：\n３ 税務署長の主張（経済的帰属・実質支配説）：\n\n第３ 設問３について（解体費用及び資産損失の計算）\n１ 解体費用300万円の必要経費算入：\n２ 建物取壊しの資産損失（簿価850万円）と損益通算：`
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
    template: `第１ ２社の行為と不当な取引制限（独占禁止法2条6項、3条後段）の成否\n１ 「事業者」該当性（2条1項）\n２ 「共同して」（意思の連絡の認定）\n３ 「相互にその事業活動を拘束」\n４ 「一定の取引分野における競争を実質的に制限」\n ア 市場画定：\n イ 競争の実質的制限の規範及び当てはめ：\n５ 発注者Aの関与（官製談合）と２社の責任\n６ 一般競争入札への反対要請の評価`
  }
};

const MASTER_STATUTES = [
  // 憲法・行政法
  { law: '憲法', num: '第13条', title: '個人の尊重・幸福追求権', text: 'すべて国民は、個人として尊重される。生命、自由及び幸福追求に対する国民の権利については、公共の福祉に反しない限り、立法その他の国政の上で、最大の尊重を必要とする。' },
  { law: '憲法', num: '第14条', title: '法の下の平等', text: 'すべて国民は、法の下に平等であって、人種、信条、性別、社会的身分又は門地により、政治的、経済的又は社会的関係において、差別されない。' },
  { law: '憲法', num: '第21条', title: '表現の自由', text: '1 集会、結社及び言論、出版その他一切の表現の自由は、これを保障する。\n2 検閲は、これをしてはならない。通信の秘密は、これを侵してはならない。' },
  { law: '憲法', num: '第31条', title: '適正手続の保障', text: '何人も、法律の定める手続によらなければ、その生命若しくは自由を奪はれ、又はその他の刑罰を科せられない。' },
  { law: '行政事件訴訟法', num: '第3条', title: '抗告訴訟', text: '2 この法律において「処分の取消しの訴え」とは、行政庁の処分その他公権力の行使に当たる行為の取消しを求める訴訟をいう。' },
  { law: '行政事件訴訟法', num: '第9条', title: '原告適格', text: '1 処分の取消しの訴え及び裁決の取消しの訴えは、当該処分又は裁決の取消しを求めるにつき法律上の利益を有する者に限り、提起することができる。' },
  { law: '行政事件訴訟法', num: '第30条', title: '裁量処分の取消し', text: '行政庁の裁量に属する処分については、裁量権の範囲をこえ又はその濫用があつた場合に限り、裁判所は、その処分を取り消すことができる。' },
  { law: '地方自治法', num: '第244条', title: '公の施設', text: '1 普通地方公共団体は、住民の福祉を増進する目的をもつてその利用に供するための施設（これを公の施設という。）を設けるものとする。\n2 普通地方公共団体は、正当な理由がない限り、住民が公の施設を利用することを拒んではならない。' },

  // 民事系
  { law: '民法', num: '第93条', title: '心裡留保', text: '意思表示は、表意者がその真意ではないことを知ってしたときであっても、そのためにその効力を妨げられない。ただし、相手方がその意思表示が表意者の真意ではないことを知り、又は知ることができたときは、その意思表示は、無効とする。' },
  { law: '民法', num: '第94条', title: '通謀虚偽表示', text: '1 相手方と通じてした虚偽の意思表示は、無効とする。\n2 前項の規定による意思表示の無効は、善意の第三者に対抗することができない。' },
  { law: '民法', num: '第392条', title: '共同抵当の配当', text: '2 債権者が特定の不動産の代価のみから弁済を受けたときは、その不動産より後順位の抵当権者は、前項の規定に基づき他の不動産の代価から弁済を受けることができた額の限度において、その抵当権者に代位して抵当権を行使することができる。' },
  { law: '民法', num: '第467条', title: '指名債権の譲渡の対抗要件', text: '1 指名債権の譲渡は、譲渡人が債務者に通知をし、又は債務者が承諾をしなければ、債務者その他の第三者に対抗することができない。' },
  { law: '民法', num: '第482条', title: '代物弁済', text: '債務者が、債権者の承諾を得て、その負担した給付に代えて他の給付をしたときは、その給付は、弁済と同一の効力を有する。' },
  { law: '民法', num: '第501条', title: '弁済による代位の効果', text: '1 弁済による代位をした者は、債権の効力及び担保としてその債権者が有していた一切の権利を行使することができる。' },
  { law: '民法', num: '第511条', title: '差押えを受けた債権の相殺', text: '2 差押えを受けた債権の第三債務者は、差押え後に取得した債権による相殺をもつて差押債権者に対抗することはできないが、差押え前の原因に基づいて生じた債権による相殺をもつて対抗することができる。' },
  { law: '民法', num: '第613条', title: '転貸の効果', text: '3 賃貸人が賃借人と協議の上、賃貸借を解除したときは、賃貸人は、転借人に対してその解除の効力を主張することができない。ただし、その解除の当時、賃貸人が賃借人の債務不履行による解除権を有していたときは、この限りでない。' },
  { law: '民法', num: '第709条', title: '不法行為による損害賠償', text: '故意又は過失によって他人の権利又は法律上保護される利益を侵害した者は、これによって生じた損害を賠償する責任を負う。' },
  { law: '商法・会社法', num: '第362条', title: '取締役会の権限等', text: '2 取締役会は、次に掲げる職務を行う。\n三 代表取締役の選定及び解職' },
  { law: '商法・会社法', num: '第369条', title: '取締役会の決議', text: '2 前項の決議について特別の利害関係を有する取締役は、議決に加わることができない。' },
  { law: '商法・会社法', num: '第361条', title: '取締役の報酬等', text: '1 取締役が受ける報酬、賞与その他の職務執行の対価として会社から受ける財産上の利益についての事項は、定款に定めていないときは、株主総会の決議によつて定める。' },
  { law: '商法・会社法', num: '第206条の2', title: '支配株主の異動を伴う新株発行', text: '4 株式会社は、総株主の議決権の10分の1以上の議決権を有する株主が募集株式の割当て等に反対する旨を通知したときは、払込期日の前日までに株主総会の決議によつて承認を受けなければならない。' },
  { law: '民事訴訟法', num: '第142条', title: '重複起訴の禁止', text: '裁判所に係属する事件については、当事者は、更に訴えを提起することができない。' },
  { law: '民事訴訟法', num: '第220条', title: '文書提出義務', text: '四 次に掲げる文書のいずれにも該当しないとき。\nニ 専ら文書の所持者の利用に供するための文書' },
  { law: '民事訴訟法', num: '第228条', title: '文書の成立', text: '4 私文書は、本人又はその代理人の署名又は押印があるときは、真正に成立したものと推定する。' },
  { law: '民事保全法', num: '第23条', title: '仮処分の必要性等', text: '1 係争物に関する仮処分命令は、現状の変更により、当事者が権利を実行することができなくなるおそれがあるとき、又はこれについて著しい困難を生ずるおそれがあるときに発することができる。' },

  // 刑事系
  { law: '刑法', num: '第38条', title: '故意', text: '1 罪を犯す意思がない行為は、罰しない。ただし、法律に特別の規定がある場合は、この限りでない。' },
  { law: '刑法', num: '第43条', title: '未遂減免・中止犯', text: '犯罪の実行に着手してこれを遂げなかった者は、未遂罪として処断することができる。ただし、自己の意思により犯罪を中止したときは、その刑を減軽し、又は免除する。' },
  { law: '刑法', num: '第60条', title: '共同正犯', text: '二人以上共同して犯罪を実行した者は、すべて正犯とする。' },
  { law: '刑法', num: '第190条', title: '死体損壊・遺棄', text: '死体、遺骨、遺髪又は棺に納めてある物を損壊し、遺棄し、又は領得した者は、三年以下の懲役に処する。' },
  { law: '刑法', num: '第199条', title: '殺人', text: '人を殺した者は、死刑又は無期若しくは五年以上の懲役に処する。' },
  { law: '刑法', num: '第210条', title: '過失致死', text: '過失により人を死亡させた者は、五十万円以下の罰金に処する。' },
  { law: '刑法', num: '第218条', title: '保護責任者遺棄等', text: '老年者、幼年者、身体障害者又は病者を保護する責任のある者がこれらの者を遺棄し、又はその生存に必要な保護をしなかったときは、三月以上五年以下の懲役に処する。' },
  { law: '刑法', num: '第235条', title: '窃盗', text: '他人の財物を窃取した者は、窃盗の罪とし、十年以下の懲役又は五十万円以下の罰金に処する。' },
  { law: '刑法', num: '第236条', title: '強盗', text: '1 暴行又は脅迫を用いて他人の財物を強取した者は、強盗の罪とし、五年以上の有期懲役に処する。\n2 前項の方法により、財産上不法の利益を得、又は他人にこれを得させた者も、同項と同様とする。' },
  { law: '刑法', num: '第240条', title: '強盗致死傷', text: '強盗が、人を負傷させたときは無期又は六年以上の懲役に処し、死亡させたときは死刑又は無期懲役に処する。' },
  { law: '刑法', num: '第246条', title: '詐欺', text: '1 人を欺いて財物を交付させた者は、十年以下の懲役に処する。\n2 前項の方法により、財産上不法の利益を得、又は他人にこれを得させた者も、同項と同様とする。' },
  { law: '刑法', num: '第252条', title: '横領', text: '自己の占有する他人の物を横領した者は、五年以下の懲役に処する。' },
  { law: '刑法', num: '第256条', title: '盗品等関与', text: '2 盗品その他財産に対する罪に当たる行為によって領得された物を運搬し、保管し、若しくは有償で譲り受け、又はその有償の処分のあっせんをした者は、十年以下の懲役及び五十万円以下の罰金に処する。' },
  { law: '刑事訴訟法', num: '第198条', title: '被疑者の取調べ', text: '1 検察官、検察事務官又は司法警察職員は、犯罪の捜査をするについて必要があるときは、被疑者の出頭を求め、これを取り調べることができる。但し、被疑者は、逮捕又は勾留されている場合を除いては、出頭を拒み、又は出頭後、何時でも退去することができる。' },
  { law: '刑事訴訟法', num: '第312条', title: '訴因又は罰条の変更', text: '1 裁判所は、検察官の請求があるときは、公訴事実の同一性を害しない限度において、訴因又は罰条の追加、撤回又は変更を許さなければならない。' },
  { law: '刑事訴訟法', num: '第320条', title: '伝聞証拠の排除', text: '1 第321条乃至第328条に規定する場合を除いては、公判期日における供述に代へて書面を証拠とし、又は公判期日外における他の者の供述を内容とする供述を証拠とすることはできない。' },

  // 選択科目（租税法・経済法）
  { law: '法人税法', num: '第22条', title: '各事業年度の所得の金額の計算', text: '2 益金の額に算入すべき金額は、別段の定めがあるものを除き、資産の譲渡、有償又は無償による役務の提供、無償による資産の譲受けその他の取引に係る収益の額とする。' },
  { law: '所得税法', num: '第12条', title: '実質所得者課税の原則', text: '資産又は事業から生ずる収益の法律上帰属するとみられる者が単なる名義人であつて、その収益を享受せず、その者以外の者がその収益を享受する場合には、その収益は、これを実質的に享受する者に帰属するものとして、この法律の規定を適用する。' },
  { law: '独占禁止法', num: '第1条', title: '目的', text: 'この法律は、私的独占、不当な取引制限及び不公正な取引方法を禁止し、事業支配力の過度の集中を防止して、公正且つ自由な競争を促進することを目的とする。' },
  { law: '独占禁止法', num: '第2条第6項', title: '不当な取引制限の定義', text: '事業者が、他の事業者と共同して対価を決定し、維持し、若しくは引き上げ、又は数量、取引の相手方を制限する等相互にその事業活動を拘束し、若しくは遂行することにより、公共の利益に反して、一定の取引分野における競争を実質的に制限することをいう。' },
  { law: '独占禁止法', num: '第3条', title: '私的独占又は不当な取引制限の禁止', text: '事業者は、私的独占又は不当な取引制限をしてはならない。' },
  { law: '独占禁止法', num: '第7条の2', title: '課徴金納付命令', text: '1 事業者が、不当な取引制限をしたときは、公正取引委員会は、当該事業者に対し、課徴金を国庫に納付することを命じなければならない。' }
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
  
  // ★ 制限時間を全科目一律で「70分（4200秒）」に固定
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
        // ★ 全問一律70分として適用
        const normalizedData = data.map((d: ProblemType) => ({ ...d, time_limit_minutes: 70 }));
        const merged = [...normalizedData, ...DEFAULT_PROBLEMS.filter(dp => !normalizedData.some(d => d.id === dp.id))];
        setProblems(merged);
        setSelectedProblemId(merged[0].id);
        loadDraftFromCloud(merged[0].id);
      } else {
        loadDraftFromCloud(DEFAULT_PROBLEMS[0].id);
      }
    } catch (e) {
      console.warn('Supabase問題ロードスキップ:', e);
      loadDraftFromCloud(DEFAULT_PROBLEMS[0].id);
    }
  };

  // クラウド下書き自動取得（どこでも再開）
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

  // クラウド自動保存（デバウンス同期）
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

  // ドリルから答案欄への骨子転送
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
    setSecondsLeft(70 * 60); // ★ 70分リセット
    setIsTimerRunning(false);
    setActiveTab('problem');
    loadDraftFromCloud(targetId);
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

    if (!confirm('答案を提出し、Gemini AIによる考査委員基準採点を実行しますか？')) {
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
    <div style={{ minHeight: 'calc(100vh - 56px)', backgroundColor: '#f1f5f9', color: '#0f172a', display: 'flex', flexDirection: 'column', fontFamily: 'sans-serif' }}>
      
      {/* 最上部ヘッダー */}
      <header style={{ backgroundColor: '#ffffff', borderBottom: '1px solid #cbd5e1', padding: '8px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', flexWrap: 'wrap', gap: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '20px' }}>⚖️</span>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            {/* 科目プルダウン */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#64748b' }}>科目:</span>
              <select
                value={selectedSubjectFilter}
                onChange={(e) => handleSubjectChange(e.target.value)}
                style={{
                  fontSize: '12px',
                  fontWeight: 'bold',
                  padding: '4px 8px',
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

            {/* 問題プルダウン */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#64748b' }}>問題:</span>
              <select
                value={selectedProblemId}
                onChange={(e) => handleProblemChange(e.target.value)}
                style={{
                  fontSize: '12px',
                  fontWeight: 'bold',
                  padding: '4px 8px',
                  borderRadius: '6px',
                  border: '1px solid #94a3b8',
                  backgroundColor: '#ffffff',
                  color: '#0f172a',
                  cursor: 'pointer',
                  outline: 'none',
                  maxWidth: '320px'
                }}
              >
                {filteredProblems.map((p) => (
                  <option key={p.id} value={p.id}>
                    [{p.subject}] {p.target_issue}
                  </option>
                ))}
              </select>
            </div>

            {/* クラウド同期ステータス */}
            <span style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '4px', backgroundColor: syncStatus === 'synced' ? '#dcfce7' : syncStatus === 'saving' ? '#fef9c3' : '#fee2e2', color: syncStatus === 'synced' ? '#166534' : syncStatus === 'saving' ? '#854d0e' : '#991b1b', fontWeight: 'bold' }}>
              {syncStatus === 'synced' ? '☁️ クラウド自動保存済' : syncStatus === 'saving' ? '⏳ 同期中...' : '⚠️ オフライン'}
            </span>
          </div>
        </div>

        {/* 右側：文字サイズ・70分タイマー・各画面リンク */}
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

          {/* ★ 一律70分タイマー */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: '#f8fafc', border: '1px solid #cbd5e1', padding: '3px 8px', borderRadius: '6px' }}>
            <span style={{ fontSize: '13px', fontWeight: 'bold', fontFamily: 'monospace', color: secondsLeft < 600 ? '#dc2626' : '#0f172a' }}>
              ⏱ {formatTimer(secondsLeft)}
            </span>
            <button
              type="button"
              onClick={() => setIsTimerRunning(!isTimerRunning)}
              style={{
                fontSize: '10px',
                padding: '2px 5px',
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
              padding: '5px 10px',
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

      {/* メインエリア */}
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'minmax(420px, 48%) minmax(440px, 52%)', height: 'calc(100vh - 105px)', overflow: 'hidden' }}>
        
        {/* 左ペイン：事実設問 / 全科目起案ドリル / 電子六法 */}
        <section style={{ backgroundColor: '#ffffff', borderRight: '2px solid #cbd5e1', display: 'flex', flexDirection: 'column', height: '100%' }}>
          <div style={{ display: 'flex', borderBottom: '2px solid #e2e8f0', backgroundColor: '#f8fafc', padding: '0 8px' }}>
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

          <div style={{ flex: 1, padding: '16px', overflowY: 'auto', fontSize: fontSizes[fontSize].text, lineHeight: fontSizes[fontSize].lh }}>
            
            {/* タブ1: 事実・設問 */}
            {activeTab === 'problem' && (
              <div style={{ whiteSpace: 'pre-wrap', fontFamily: 'serif', color: '#1e293b' }}>
                {currentProblem.fact_context}
              </div>
            )}

            {/* タブ2: 全科目起案ドリル ＆ 構成検討 */}
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
                        boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
                      }}
                    >
                      👉 答案欄に骨子を転送
                    </button>
                  </div>
                  <p style={{ margin: 0, fontSize: '11px', color: '#3b82f6' }}>
                    起案前の10分で即死地雷をチェックし、論点・事実・三段論法の骨子を整理します。
                  </p>
                </div>

                {/* 即死地雷チェックリスト */}
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

                {/* 法的三段論法・要件事実フレームワーク */}
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

                {/* 答案構成・ドリルメモ */}
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
                    placeholder="ここに論点メモ、拾うべき生事実、構成順序をメモしてください。&#10;ボタン1つで右側の答案作成欄へ流し込めます。"
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

            {/* タブ3: 電子六法 */}
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

        {/* 右ペイン：答案作成エディタ ＆ AI厳格採点 */}
        <section style={{ backgroundColor: '#f8fafc', display: 'flex', flexDirection: 'column', height: '100%' }}>
          <div style={{ padding: '8px 16px', backgroundColor: '#ffffff', borderBottom: '1px solid #cbd5e1', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
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
                padding: '5px 14px',
                borderRadius: '6px',
                fontSize: '11px',
                fontWeight: 'bold',
                border: 'none',
                cursor: isEvaluating ? 'not-allowed' : 'pointer',
              }}
            >
              {isEvaluating ? '⏳ 考査委員が採点中...' : '🚀 答案提出・AI厳格採点'}
            </button>
          </div>

          <div style={{ flex: aiFeedback ? '0 0 45%' : '1', padding: '10px', boxSizing: 'border-box', display: 'flex' }}>
            <textarea
              ref={textareaRef}
              value={userDraft}
              onChange={(e) => handleDraftChange(e.target.value)}
              placeholder={`【${currentProblem.target_issue}】の答案を作成してください。\n\n左ペインの「📝 全科目起案ドリル」で構成を整理し、「👉 答案欄に骨子を転送」を押すとテンプレや構成メモがここに反映されます。\n\n入力内容はクラウドへ自動保存されるため、出先やスマホからでも続きから再開できます。`}
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
                  ⚖️ 考査委員採点講評（Gemini 3.8 Flash）
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
    </div>
  );
}
