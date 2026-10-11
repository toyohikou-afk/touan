import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { userDraft, problemText, timeSpentSeconds, standardNorm, keyFacts } = body;

    if (!userDraft || userDraft.trim() === '') {
      return NextResponse.json(
        { error: '答案本文が空です。' },
        { status: 400 }
      );
    }

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json({
        subject: '民法',
        target_issue: '民法総合',
        feedback: `【システム簡易講評（APIキー未設定）】\n\n・文字数：${userDraft.length} 字\n・所要時間：${Math.floor((timeSpentSeconds || 0) / 60)} 分 ${(timeSpentSeconds || 0) % 60} 秒`,
      });
    }

    const prompt = `あなたは司法試験・予備試験の考査委員・実務家採点者です。
受験生の答案および問題文から「科目」と「主たる論点」を正確に特定し、厳格な採点・添削を行ってください。

【問題文（参考）】
${problemText || 'なし'}

【受験生の起案答案】
${userDraft}

【基準規範・参考情報】
${standardNorm || '答案から自動判定'}

【タスク】
1. 科目を「憲法」「行政法」「民法」「商法」「民事訴訟法」「刑法」「刑事訴訟法」等から1つ判定。
2. 主たる論点（例:「共犯からの離脱」「94条2項110条類推適用」等）を端的に抽出。
3. 規範定立（判例基準）、事実の抽出と法的評価、三段論法を厳格に採点。

必ず以下のJSONフォーマットのみを出力してください（Markdownコードブロックは不要）：
{
  "subject": "判定した科目名",
  "target_issue": "判定した論点名",
  "feedback": "【総合評価】...\\n\\n【第１：規範定立の評価】...\\n\\n【第２：事実のあてはめの評価】...\\n\\n【第３：三段論法・形式面の講評】...\\n\\n【次回に向けた改善ポイント】..."
}`;

    const ai = new GoogleGenAI({ apiKey: apiKey.trim() });

    let responseText = '';
    let lastError: any = null;

    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const response = await ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: prompt,
        });

        if (response.text) {
          responseText = response.text;
          break;
        }
      } catch (err: any) {
        lastError = err;
        console.warn(`Attempt ${attempt} failed:`, err.message);
        if (attempt < 3) {
          await new Promise((res) => setTimeout(res, 1500));
        }
      }
    }

    if (!responseText) {
      throw lastError || new Error('採点生成に失敗しました。');
    }

    // JSONパース（Markdown表記除去を含む安全設計）
    let cleanJson = responseText.trim();
    if (cleanJson.startsWith('```json')) cleanJson = cleanJson.slice(7);
    if (cleanJson.startsWith('```')) cleanJson = cleanJson.slice(3);
    if (cleanJson.endsWith('```')) cleanJson = cleanJson.slice(0, -3);

    let parsedResult: any = {};
    try {
      parsedResult = JSON.parse(cleanJson);
    } catch {
      parsedResult = {
        subject: '判定中',
        target_issue: '論点分析',
        feedback: responseText,
      };
    }

    return NextResponse.json({
      subject: parsedResult.subject || '法律総合',
      target_issue: parsedResult.target_issue || '総合問題',
      feedback: parsedResult.feedback || responseText,
    });
  } catch (error: any) {
    console.error('API Route Exception:', error);
    return NextResponse.json({
      feedback: `【採点処理エラー】\n${error.message || '予期せぬエラーが発生しました。'}`,
    });
  }
}
