import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

export async function POST(req: NextRequest) {
  try {
    const { userDraft, drillNotes, problemText, timeSpentSeconds, standardNorm, keyFacts } = await req.json();

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'GEMINI_API_KEY が未設定です' }, { status: 500 });
    }

    const ai = new GoogleGenAI({ apiKey });

    const prompt = `あなたは司法試験・予備試験の論文式試験における厳格な考査委員（採点官）です。
受験生が起案した以下の【答案本文】、および起案時に作成された【答案構成メモ】を厳格に採点・講評してください。

【問題文（事実・設問）】
${problemText || '記載なし'}

【出題の趣旨・判例の規範定立】
${standardNorm || '記載なし'}

【拾うべき生事実・考慮要素】
${Array.isArray(keyFacts) ? keyFacts.join('\n') : (keyFacts || '記載なし')}

【起案にかかった時間】
${timeSpentSeconds ? `${Math.floor(timeSpentSeconds / 60)}分${timeSpentSeconds % 60}秒` : '不明'}

【答案構成メモ（起案前ドリル）】
${drillNotes ? drillNotes : '（構成メモなし）'}

【作成された答案本文】
${userDraft}

---
以下の構成で、答案作成に直結する具体的かつ実践的な講評を作成してください：

### 1. 得点判定・総合評価
- 予想得点（70点満点換算）
- 合否水準（優秀 / 合格ライン / 不合格）

### 2. 答案構成・思考枠組みの評価（構成メモの補完チェック）
- 検討順序の妥当性（例: 主犯先行、訴訟要件→本案、三段階審査等の遵守）
- 考査委員の即死地雷（致命的減点項目）を踏んでいないか

### 3. 判例規範の定立と理由づけ
- 規範のキーワードが正確か、論証の論理的飛躍がないか

### 4. 具体的事実の当てはめ・評価
- 問題文の生事実を過不足なく拾い、評価を加えているか

### 5. 次回に向けた具体的な改善ポイント
- 答案作成に直結する修正指示を1〜2点
`;

    // ★ gemini-3.8-flash を指定
    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
    });

    return NextResponse.json({ feedback: response.text });
  } catch (error: unknown) {
    console.error('AI採点エラー:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '採点処理中にエラーが発生しました' },
      { status: 500 }
    );
  }
}
