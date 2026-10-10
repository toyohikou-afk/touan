import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { subject, year, mode, targetIssue } = await req.json();
    const isKaidai = mode === 'kaidai';
    const issueName = targetIssue || `${subject || '刑法'}の重要論点`;

    const apiKey = process.env.GEMINI_API_KEY;

    // Gemini API が利用可能な場合はAI生成を試行
    if (apiKey) {
      try {
        const prompt = `
あなたは司法試験・予備試験の論文式試験考査委員です。
以下の条件に厳格に準拠し、70分起案に耐えうる論理的破綻のない本試験レベルの【${isKaidai ? '過去問改題（事実関係をひねった実戦問題）' : '過去問再現問題'}】を1問作成してください。

【設定条件】
- 科目: ${subject}
- 出題年度: ${year}
- 指定論点: ${issueName}
- 出題形式: ${isKaidai ? '基本構造を踏まえつつ、当事者の過失や関与度などの事実関係を改変した改題' : '本試験過去問の典型事例に即した出題'}

【絶対遵守ルール（事実と設問の整合性）】
1. 事実関係（各段落）と設問の指示は100%整合させてください。
   - 事実文に存在しない罪名・争点（例：事実は侵入窃盗なのに「詐欺罪」や「不法原因給付」を問う等）を設問で指定することは厳禁です。
   - 設問で問う論点は、必ず事実関係の中にあてはめの根拠となる具体的言動・客観的事実（日時、場所、認識、損害額等）を記載してください。
2. fact_context は、時系列に沿った段落（１、２、３...）に続け、最終段落に独立して【設問】を配置してください。
3. 答案作成に直結する表現で、判例の規範定立および当てはめ基準（考慮要素）を明示してください。

必ず以下のJSONフォーマットのみを出力してください（Markdownのバッククォート等も含めないでください）。
{
  "source_exam": "${year} 予備試験${isKaidai ? '改題' : ''}",
  "target_issue": "${issueName}",
  "suggested_time_minutes": 70,
  "fact_context": "１ （犯意・計画等の事実関係）\\n２ （実行行為等の事実関係）\\n３ （結果発生・事後処理等の事実関係）\\n\\n【設問】\\n各当事者の罪責（または法的請求）について、上記事実関係に現れた行為に直結する論点のみを対象として論ぜよ。",
  "standard_norm": "【判例規範定立】...\\n【当てはめ基準】..."
}
`;

        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
        const geminiRes = await fetch(apiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { response_mime_type: 'application/json' },
          }),
        });

        if (geminiRes.ok) {
          const resJson = await geminiRes.json();
          const rawText = resJson.candidates?.[0]?.content?.parts?.[0]?.text;
          if (rawText) {
            const parsed = JSON.parse(rawText);
            return NextResponse.json(parsed);
          }
        }
      } catch (e) {
        console.warn('Gemini生成フォールバックへ移行:', e);
      }
    }

    // APIキー未設定または通信エラー時の安全なフォールバック
    const isCriminal = subject?.includes('刑');
    const fallbackFact = isCriminal
      ? `１ 甲は、乙と共謀して深夜の店舗Vに侵入し、現金を窃取することを計画した。\n２ 甲が見張りを行う中、乙が店舗の勝手口を損壊して店内に侵入し、レジから現金50万円を窃取した。\n３ その後、甲及び乙は待機させていた自動車に乗って逃走した。\n\n【設問】\n甲及び乙の罪責について、建造物侵入罪および窃盗罪の共同正犯の成立要件を含めて論ぜよ。`
      : `１ Aは、自己の所有する甲土地について、融資を受ける目的で親族Bの承諾を得て名義のみをBに移転させる登記を経由させた。\n２ その後、BはAに無断で自らを真の権利者と偽り、善意無過失のCに対して甲土地を売却し、所有権移転登記を完了させた。\n３ AはCに対し、真の所有者であると主張して登記の抹消を請求した。\n\n【設問】\nAの請求の当否について、民法94条2項の類推適用の可否を含めて論ぜよ。`;

    const fallbackNorm = isCriminal
      ? `【判例規範定立】\n共同正犯（刑法60条）の処罰根拠は、相互利用補充関係の下に共同して法益侵害結果を惹起した点にある。成立には共謀（共同実行の合意）およびこれに基づく実行行為を要する。\n【当てはめ基準】\n①共謀の存在（犯行連絡・意思の連絡）、②正犯意思（犯行における主導的地位、利得の分配等）、③関与行為の重大性（見張り等の寄与度）を総合考慮する。`
      : `【判例規範定立】\n権利外観法理に基づき、本人が自ら不実の登記等の外観を作出した帰責性がある場合、善意の第三者を保護するため民法94条2項を類推適用し、本人は外観の不実を対抗できない。\n【当てはめ基準】\n①虚偽の外観の存在、②本人の外観作出に対する帰責性（自ら仮装したか、放置したか）、③第三者の正当な信頼（善意・無過失）を衡量して判断する。`;

    const fallbackData = {
      source_exam: `${year} 予備試験${isKaidai ? '改題' : ''}`,
      target_issue: isCriminal ? '共謀共同正犯の成立要件' : '権利外観法理（94条2項類推適用）',
      suggested_time_minutes: 70,
      fact_context: fallbackFact,
      standard_norm: fallbackNorm,
    };

    return NextResponse.json(fallbackData);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}