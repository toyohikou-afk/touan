import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'GEMINI_API_KEY が未設定です。' }, { status: 500 });
    }

    const { userDraft, problemText, timeSpentSeconds, standardNorm, keyFacts } = await req.json();

    if (!userDraft || !userDraft.trim()) {
      return NextResponse.json({ error: '答案が入力されていません。' }, { status: 400 });
    }

    const systemPrompt = `あなたは予備試験・司法試験刑法論文の考査委員です。
本番CBTで提出された答案を、厳格な法的三段論法・判例の規範定立・当てはめ基準に照らして容赦なく採点・添削してください。

【採点基準・審査項目】
1. 判例規範の定立:
   - 抽象論を並べるだけでなく、当該論点の判例が示す規範（因果性の遮断、反抗抑圧の利用等）が正確・簡潔に定立されているか。
2. 事実の摘示と評価（当てはめ）:
   - 問題文の具体的生事実（凶器の提供、離脱の拒絶、心理的・物理的因果性の残存等）を拾い、規範の要件に即して実質的に評価しているか。
   - 単なる事実の引き写し（事実の羅列）に終わっていないか。
3. 罪責の検討順序:
   - 実行正犯（乙）から客観的構成要件該当性を確定させ、その後に共犯者（甲）の罪責を論ずる論理的一貫性が保たれているか。

【講評の出力構成】
## 総合判定（得点目安: 0〜50点 / 推定ランク: A〜F）
## 1. 致命的欠陥・地雷の検知（あれば厳しく指摘）
## 2. 判例規範の定立度チェック
## 3. 事実の評価と当てはめの深さ
## 4. 考査委員からの直言・合格水準への処方箋`;

    const userPrompt = `【問題・事実関係】
${problemText}

【基準となる判例規範】
${standardNorm || '共犯関係からの離脱における物理的・心理的因果性の遮断'}

【答案で拾うべきキーファクト】
${JSON.stringify(keyFacts || [])}

【受験生答案（起案時間: 約 ${Math.floor((timeSpentSeconds || 0) / 60)} 分）】
${userDraft}`;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key=${apiKey}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          { role: 'user', parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }] }
        ],
        generationConfig: { temperature: 0.2 }
      })
    });

    if (!res.ok) {
      throw new Error(`Gemini API エラー: ${res.status}`);
    }

    const data = await res.json();
    const feedback = data.candidates?.[0]?.content?.parts?.[0]?.text || '講評を生成できませんでした。';

    return NextResponse.json({ feedback });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
