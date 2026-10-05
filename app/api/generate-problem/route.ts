import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { subject, year, mode, targetIssue } = await req.json();
    const isKaidai = mode === 'kaidai';
    const issueName = targetIssue || `${subject}の最重要論点`;

    const apiKey = process.env.GEMINI_API_KEY;

    // Gemini API が利用可能な場合はAI生成を試行
    if (apiKey) {
      try {
        const prompt = `
あなたは司法試験・予備試験の論文式試験考査委員です。
以下の条件に完全準拠し、本試験レベルの【${isKaidai ? '過去問改題（事実関係をひねった実戦問題）' : '過去問再現問題'}】を1問作成してください。

【設定条件】
- 科目: ${subject}
- 出題年度: ${year}
- 論点: ${issueName}
- 出題形式: ${isKaidai ? '基本構造を踏まえつつ、当事者の過失や関与度などの事実関係を改変した改題' : '本試験過去問の典型事例に即した出題'}

【出力要件】
答案作成に直結する表現で、判例の規範定立および当てはめ基準（考慮要素）を明示してください。
Markdown等の余計な装飾は入れず、必ず以下のJSON形式のみを出力してください。
{
  "source_exam": "${year} 予備試験${isKaidai ? '改題' : ''}",
  "target_issue": "${issueName}",
  "suggested_time_minutes": 70,
  "fact_context": "段落番号（１、２、３...）を付した本番同様の長文事実関係（当事者の行動、取引内容、時系列）",
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

    // APIキー未設定または通信エラー時のフォールバック（論点直結の高品質問題）
    const fallbackData = {
      source_exam: `${year} 予備試験${isKaidai ? '改題' : ''}`,
      target_issue: issueName,
      suggested_time_minutes: 70,
      fact_context: `１ Aは、自己の所有する甲財産について、融資を受ける目的で親族Bの承諾を得て名義のみをBに移転させる登記を経由させた。\n２ その後、BはAに無断で自らを真の権利者と偽り、善意無過失のCに対して甲財産を代金相当額で売却し、登記を引き渡した。\n３ AはCに対し、真の所有者であると主張して登記の抹消を請求した。\n４ Aの請求の当否について、${issueName}を踏まえて論ぜよ。`,
      standard_norm: `【判例の規範定立】\n権利外観法理に基づき、本人が自ら外観を作出した帰責性が認められる場合、善意の第三者を保護するため本人は外観の不実を対抗できない。\n【当てはめ基準】\n①虚偽の外観の存在、②本人の外観作出に対する帰責性の程度、③相手方の主観的信頼（善意・無過失）を衡量して決する。`,
    };

    return NextResponse.json(fallbackData);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}