// app/api/local-suggest/route.ts
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { currentText, targetIssue } = await req.json();
    const localEndpoint = process.env.LOCAL_AI_ENDPOINT || 'http://127.0.0.1:11434/api/generate';

    const prompt = `
司法試験論文答案の下書きを支援してください。
現在起案中の論点: ${targetIssue}
受験生が入力した直近の文章:
"${currentText.slice(-300)}"

上記に続けて展開すべき「判例の規範定立」または「着目すべき当てはめの考慮要素」を3行以内で箇条書き提示してください。
`;

    const res = await fetch(localEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'qwen2.5:7b',
        prompt,
        stream: false,
      }),
    });

    if (!res.ok) {
      return NextResponse.json({ suggestion: '（ローカルAIサーバー停止中）' });
    }

    const data = await res.json();
    return NextResponse.json({ suggestion: data.response });
  } catch (error: any) {
    return NextResponse.json({ suggestion: 'ローカル接続待機中' });
  }
}