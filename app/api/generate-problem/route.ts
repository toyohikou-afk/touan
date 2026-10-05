import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { subject, mode, targetIssue } = await req.json();

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Vercelに GEMINI_API_KEY が設定されていません。' },
        { status: 500 }
      );
    }

    const isKaidai = mode === 'kaidai';
    const prompt = `
あなたは予備試験・司法試験の論文試験考査委員です。
以下の条件に完全準拠し、予備試験論文式試験の【${isKaidai ? '過去問の改題（事実関係をひねった実戦問題）' : '過去問の典型再現問題'}】を1問作成してください。

【設定条件】
- 科目: ${subject}
- 出題形式: ${isKaidai ? '過去問の基本構造を踏まえつつ、当事者の過失や関与度などの事実関係を改変した改題' : '予備試験過去問の典型事例に即した出題'}
- 希望論点: ${targetIssue ? targetIssue : '予備試験における最重要・頻出論点をAIが自動選定'}

【必須出力フォーマット】
Markdown等の装飾は一切入れず、必ず以下のJSONフォーマットのみを返してください。
{
  "source_exam": "出題形式（例: 令和5年 予備試験${isKaidai ? '改題' : ''}）",
  "target_issue": "論点名（例: 民法94条2項類推適用（意思外観対応型））",
  "suggested_time_minutes": 70,
  "fact_context": "段落番号（１、２、３...）を付した本番同様の長文問題文",
  "standard_norm": "答案作成に直結する判例規範定立および当てはめ基準"
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
      throw new Error(`Gemini APIエラー (${geminiRes.status}): ${errText}`);
    }

    const resJson = await geminiRes.json();
    const rawText = resJson.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!rawText) {
      throw new Error('Geminiから問題データが取得できませんでした。');
    }

    const parsedData = JSON.parse(rawText);
    return NextResponse.json(parsedData);
  } catch (err: any) {
    console.error('問題生成APIエラー:', err);
    return NextResponse.json(
      { error: err.message || '問題生成処理に失敗しました。' },
      { status: 500 }
    );
  }
}