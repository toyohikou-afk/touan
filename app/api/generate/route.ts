import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { passcode, prompt: rawPrompt, subject, mode, targetIssue } = body;

    // =========================================================
    // 1. 管理者ログイン認証（?admin=パスワード からの呼び出し）
    // =========================================================
    if (passcode !== undefined) {
      const expectedPasscode = process.env.ADMIN_PASSCODE;
      if (!expectedPasscode) {
        return NextResponse.json(
          { error: 'サーバー側（Vercel）に環境変数 ADMIN_PASSCODE が設定されていません' },
          { status: 500 }
        );
      }

      if (passcode === expectedPasscode) {
        return NextResponse.json({ success: true });
      } else {
        return NextResponse.json(
          { error: 'パスワードが一致しません' },
          { status: 401 }
        );
      }
    }

    // =========================================================
    // 2. Gemini API キー確認
    // =========================================================
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'GEMINI_API_KEYが設定されていません' },
        { status: 500 }
      );
    }

    // =========================================================
    // 3. 短答過去問・論証カード生成モード（rawPrompt が渡された場合）
    // =========================================================
    if (rawPrompt) {
      const ronshoPrompt = `
あなたは予備試験・司法試験の専門講師です。以下の指示に基づき、論証カード用のJSONデータを作成してください。
必ず以下のJSONフォーマットのみを出力してください（Markdownのバッククォート不要）。
{
  "subject": "科目名（例: 民法、会社法、刑法など）",
  "topic": "論点名",
  "article_num": "関連条文（例: 民法117条1項）",
  "norm": "答案にそのまま書ける判例の規範定立",
  "application_criteria": ["当てはめ基準・考慮要素1", "当てはめ基準・考慮要素2"]
}

【指示】
${rawPrompt}
`;
      const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
      const geminiRes = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: ronshoPrompt }] }],
          generationConfig: { response_mime_type: 'application/json' },
        }),
      });

      const resJson = await geminiRes.json();
      const rawText = resJson.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!rawText) {
        throw new Error('Geminiからの応答が空でした');
      }
      return NextResponse.json(JSON.parse(rawText));
    }

    // =========================================================
    // 4. 論文起案画面からの問題自動生成モード（subject 等が渡された場合）
    // =========================================================
    const examPrompt = `
あなたは予備試験・司法試験の論文試験考査委員です。
以下の条件に基づき、予備試験論文式試験の過去問またはその実戦的な【${mode === 'kaidai' ? '改題・ひねり問題' : '過去問再現問題'}】を1問作成してください。

【設定条件】
- 科目: ${subject}
- 希望論点・テーマ: ${targetIssue ? targetIssue : '予備試験における最重要・頻出論点をAIが自動選定'}
- 作成モード: ${mode === 'kaidai' ? '過去問の基本構造を踏襲しつつ、事実関係（登場人物の関与度や主観的過失など）を改変した改題' : '予備試験過去問の典型事例に即した本試験レベルの良問'}

【出力要件】
必ず以下のJSONフォーマットのみを出力してください（Markdownのバッククォート等も不要です）。
{
  "source_exam": "出題年度・形式（例: 令和5年 予備試験改題）",
  "target_issue": "主要論点名（例: 民法94条2項類推適用（意思外観対応型））",
  "suggested_time_minutes": 70,
  "fact_context": "問題文の事実関係全文（段落番号１、２、３...を付した予備試験特有のリアルな長文）",
  "standard_norm": "答案作成に直結する判例の規範定立および当てはめ基準"
}
`;

    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
    const geminiRes = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: examPrompt }] }],
        generationConfig: { response_mime_type: 'application/json' },
      }),
    });

    const resJson = await geminiRes.json();
    const rawText = resJson.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!rawText) {
      throw new Error('Geminiからの応答が空でした');
    }

    const parsedData = JSON.parse(rawText);
    return NextResponse.json(parsedData);
  } catch (err: any) {
    console.error('API処理エラー:', err);
    return NextResponse.json(
      { error: err.message || '処理に失敗しました' },
      { status: 500 }
    );
  }
}
