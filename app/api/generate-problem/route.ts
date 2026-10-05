import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { subject, year, mode, targetIssue } = await req.json();

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Vercelに GEMINI_API_KEY が設定されていません。' },
        { status: 500 }
      );
    }

    const isKaidai = mode === 'kaidai';
    const prompt = `
あなたは予備試験・司法試験の論文式試験考査委員です。
以下の条件に厳密に従い、予備試験論文式試験の【${isKaidai ? '過去問の改題（事実関係をひねった実戦問題）' : '過去問の再現問題'}】を1問作成してください。

【指定条件】
- 科目: ${subject}
- 出題年度: ${year}
- 指定論点: ${targetIssue}
- 出題形式: ${isKaidai ? '過去問の基本構造を踏まえつつ、当事者の過失や関与度などの事実関係を改変した改題' : '本試験過去問の典型事例に即した出題'}

【出力要件】
余計な解説やMarkdownコードブロックは一切含めず、必ず以下のJSONフォーマットのみを出力してください。
{
  "source_exam": "${year} 予備試験${isKaidai ? '改題' : ''}",
  "target_issue": "${targetIssue}",
  "suggested_time_minutes": 70,
  "fact_context": "段落番号（１、２、３...）を付した本番同様の具体的かつ長文の事実関係（当事者の行動、契約内容、日時など）",
  "standard_norm": "答案作成に直結する判例規範定立および考慮要素・当てはめ基準"
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

    if (!geminiRes.ok) {
      const errText = await geminiRes.text();
      throw new Error(`Gemini APIエラー: ${errText}`);
    }

    const resJson = await geminiRes.json();
    const rawText = resJson.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawText) throw new Error('APIからの応答が空でした');

    const parsedData = JSON.parse(rawText);
    return NextResponse.json(parsedData);
  } catch (err: any) {
    console.error('問題生成エラー:', err);
    return NextResponse.json({ error: err.message || '問題生成失敗' }, { status: 500 });
  }
}