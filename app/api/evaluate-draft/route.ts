import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

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
      return NextResponse.json({
        feedback: `【システム簡易講評（APIキー未設定）】\n\n・起案文字数：${userDraft.length} 字\n・所要時間：${Math.floor((timeSpentSeconds || 0) / 60)} 分 ${(timeSpentSeconds || 0) % 60} 秒\n\n※Vercelに GEMINI_API_KEY を設定してください。`,
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

    const ai = new GoogleGenAI({ apiKey: apiKey.trim() });
    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
    });

    const feedbackText = response.text || '講評を生成できませんでした。';

    return NextResponse.json({ feedback: feedbackText });
  } catch (error: any) {
    console.error('API Route Exception:', error);
    return NextResponse.json({
      feedback: `【採点処理エラー】\n${error.message || '予期せぬエラーが発生しました。'}`,
    });
  }
}
