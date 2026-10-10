import { NextResponse } from 'next/server';

// 優先順位順のモデルリスト（ピーク時フォールバック用）
const FALLBACK_MODELS = [
  'gemini-3.8-flash',
  'gemini-3.8-pro',
  'gemini-2.5-flash',
];

export async function POST(req: Request) {
  try {
    const { subject, year, mode, targetIssue } = await req.json();
    const isKaidai = mode === 'kaidai';
    const issueName = targetIssue || `${subject || '刑法'}の最重要論点`;

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: 'GEMINI_API_KEY が設定されていません。' },
        { status: 500 }
      );
    }

    const prompt = `
あなたは司法試験・予備試験の論文式試験考査委員です。
以下の指定条件に基づき、70分起案用として論理的破綻のない高品質な本試験レベルの【${isKaidai ? '過去問改題（事実関係をひねった実戦問題）' : '過去問再現問題'}】を1問作成してください。

【設定条件】
- 科目: ${subject}
- 出題年度: ${year}
- 指定論点: ${issueName}
- 出題形式: ${isKaidai ? '基本構造を踏まえつつ、当事者の過失や関与度などの事実関係を改変した改題' : '本試験過去問の典型事例に即した出題'}

【絶対遵守の作問ルール（キメラ・不整合の完全排除）】
1. 事実関係（各段落）と設問の指示は100%整合させてください。
   - 事実文に存在しない罪名・争点（例：事実は侵入窃盗なのに「詐欺罪」や「不法原因給付」を問う等）を設問で指定することは厳禁です。
   - 設問で論述を求める論点（${issueName}）については、必ず事実関係の中にあてはめの根拠となる具体的言動・客観的事実（日時、場所、当事者の認識、損害額等）を記載してください。
2. fact_context は、時系列に沿った段落（１、２、３...）で生の事実を記述し、最終段落に【設問】を配置してください。
3. 答案作成に直結する表現で、判例の規範定立および当てはめ基準（考慮要素）を明示してください。

必ず以下のJSONフォーマットのみを出力してください（Markdownのバッククォート等は含めないでください）。
{
  "source_exam": "${year} 予備試験${isKaidai ? '改題' : ''}",
  "target_issue": "${issueName}",
  "suggested_time_minutes": 70,
  "fact_context": "１ （犯意・共謀等の事実関係）\\n２ （実行行為等の事実関係）\\n３ （結果発生等の事実関係）\\n\\n【設問】\\n各当事者の罪責について、上記事実関係に現れた行為に直結する論点（${issueName}）を対象として論ぜよ。",
  "standard_norm": "【判例規範定立】...\\n【当てはめ基準】...",
  "statutes": [
    { "title": "関連条文名", "text": "条文内容" }
  ]
}
`;

    let lastErrorText = '';

    // 🌟 ピーク時対策：モデル順次フォールバックループ
    for (const modelName of FALLBACK_MODELS) {
      try {
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

        const res = await fetch(apiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { response_mime_type: 'application/json' },
          }),
        });

        if (res.ok) {
          const resJson = await res.json();
          const rawText = resJson.candidates?.[0]?.content?.parts?.[0]?.text;
          if (rawText) {
            const parsed = JSON.parse(rawText);
            return NextResponse.json(parsed);
          }
        } else {
          lastErrorText = await res.text();
          console.warn(`モデル ${modelName} が失敗（ステータス: ${res.status}）。次のモデルへフォールバックします...`);
        }
      } catch (err: any) {
        lastErrorText = err.message;
        console.warn(`モデル ${modelName} 呼び出し中に例外発生。次を試行します。`);
      }
    }

    // 全モデルが失敗した場合のみエラーを返す
    throw new Error(`全モデルでの生成が失敗しました: ${lastErrorText}`);
  } catch (err: any) {
    console.error('作問APIエラー:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}