import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { userDraft, timeSpentSeconds, standardNorm, keyFacts } = body;

    if (!userDraft || userDraft.trim() === '') {
      return NextResponse.json(
        { error: '答案本文が空です。' },
        { status: 400 }
      );
    }

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      console.warn('GEMINI_API_KEY is not set. Returning template review.');
      return NextResponse.json({
        feedback: `【システム簡易講評（APIキー設定待機中）】\n\n・起案文字数：${userDraft.length} 字\n・所要時間：${Math.floor((timeSpentSeconds || 0) / 60)} 分 ${(timeSpentSeconds || 0) % 60} 秒\n\n※Vercelの「Settings > Environment Variables」に GEMINI_API_KEY を登録すると、規範定立や事実あてはめを精査するAI自動添削が有効になります。`,
      });
    }

    const prompt = `あなたは司法試験・予備試験の考査委員・実務家採点者です。
受験生が作成した以下の起案答案を、答案作成に直結する表現で厳格に採点・添削してください。

【採点基準・着眼点】
1. 規範定立：条文の趣旨から判例の規範を正確に導き出せているか。
2. あてはめ：問題文の生の事実を漏れなく拾い、法的評価を加えたあてはめができているか。
3. 三段論法：問題提起→規範定立→あてはめ→結論の骨格が崩れていないか。

【問題の基準規範】
${standardNorm || '民法94条2項・110条類推適用に関する判例規範'}

【拾うべき生の事実】
${keyFacts ? JSON.stringify(keyFacts) : '事実関係'}

【受験生の起案答案】
${userDraft}

【出力フォーマット】
以下の構成で具体的かつ実践的に講評してください：
【総合評価】（A〜F判定、または推定得点・目安）
【第１：規範定立の評価】（判例との整合性・表現の過不足）
【第２：事実のあてはめの評価】（拾えた事実・落とした事実・法的評価の質）
【第３：三段論法・形式面の講評】
【次回に向けた改善ポイント】`;

    // 安定版 gemini-1.5-flash エンドポイント
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [{ text: prompt }],
          },
        ],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('Gemini API Error Body:', errText);
      return NextResponse.json({
        feedback: `【通信エラー】Gemini APIの呼び出しに失敗しました（ステータス: ${response.status}）。\n詳細: ${errText}`,
      });
    }

    const data = await response.json();
    const feedbackText =
      data.candidates?.[0]?.content?.parts?.[0]?.text || '講評を生成できませんでした。';

    return NextResponse.json({ feedback: feedbackText });
  } catch (error: any) {
    console.error('API Route Error:', error);
    return NextResponse.json(
      { error: error.message || '内部サーバーエラーが発生しました。' },
      { status: 500 }
    );
  }
}
