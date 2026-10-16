import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function POST(req: NextRequest) {
  try {
    const { subject, topicOrStatute } = await req.json();

    if (!topicOrStatute || !topicOrStatute.trim()) {
      return NextResponse.json({ error: '論点名または条文番号を入力してください' }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'GEMINI_API_KEY が未設定です' }, { status: 500 });
    }

    const ai = new GoogleGenAI({ apiKey });

    const prompt = `あなたは司法試験・予備試験の論文指導における厳格な考査委員基準の法学者です。
受験生が効率的に論証を暗記し、本番の答案作成に直結する表現を身につけられるよう、以下の【科目】および【指定された論点・条文】に基づき、答案でそのまま使える判例規範・理由づけ・問題提起・穴埋めキーワードをJSON形式で生成してください。

【科目】
${subject || '刑法'}

【指定された論点または条文番号】
${topicOrStatute}

【生成基準（厳守）】
1. title: 短く的確な論点カードタイトル（例: 「不動産二重譲渡と背信的悪意者排除の法理」「共犯からの離脱（着手前）」など）
2. issue: 論文答案の冒頭で使える簡潔な問題提起・検討課題（1〜2文）
3. norm: 判例の規範定立および論理的理由づけ。答案作成に直結する正確なキーワードを含み、当てはめ基準が明確な論証文（150〜300字程度）。
4. keywords: 暗記マスク（穴埋め）にすべき、答案で落とすと致命的減点になる核心的な法条語句・判例キーワード（3〜6個の配列）。

必ず以下のJSON形式のみを出力してください（Markdownコードブロックは不要、純粋なJSON文字列のみ）：
{
  "title": "カードタイトル",
  "issue": "問題提起文",
  "norm": "判例規範・理由づけ文",
  "keywords": ["重要語句1", "重要語句2", "重要語句3"]
}`;

    // ★ 最新の安定モデル gemini-3.8-flash と推奨モデル gemini-3.1-pro-preview を指定
    const candidateModels = ['gemini-3.8-flash', 'gemini-3.1-pro-preview'];
    let lastError: unknown = null;
    let cardData = null;

    for (const model of candidateModels) {
      for (let attempt = 1; attempt <= 2; attempt++) {
        try {
          const response = await ai.models.generateContent({
            model,
            contents: prompt,
            config: {
              responseMimeType: 'application/json',
            },
          });

          if (response && response.text) {
            const cleaned = response.text.replace(/```json/g, '').replace(/```/g, '').trim();
            cardData = JSON.parse(cleaned);
            break;
          }
        } catch (err: unknown) {
          lastError = err;
          console.warn(`[カード生成API] モデル ${model} 試行 ${attempt} 失敗:`, err instanceof Error ? err.message : err);
          if (attempt < 2) await sleep(1500);
        }
      }
      if (cardData) break;
    }

    if (!cardData) {
      throw lastError || new Error('カード生成に失敗しました');
    }

    return NextResponse.json(cardData);
  } catch (error: unknown) {
    console.error('カード生成APIエラー:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'カード生成処理中にエラーが発生しました' },
      { status: 500 }
    );
  }
}
