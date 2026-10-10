import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: Request) {
  try {
    const { subject, year, mode, targetIssue } = await req.json();
    const isKaidai = mode === 'kaidai';
    const issueName = targetIssue || `${subject || '刑法'}の最重要論点`;

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    // 1. Supabaseの事前ストックがあれば即時返却
    if (supabaseUrl && supabaseKey) {
      try {
        const supabase = createClient(supabaseUrl, supabaseKey);
        const { data: stockProb } = await supabase
          .from('sub_problems')
          .select('*')
          .eq('subject', subject)
          .eq('target_issue', issueName)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (stockProb && stockProb.fact_context) {
          return NextResponse.json({
            id: stockProb.id,
            source_exam: stockProb.source_exam || `${year} 予備試験`,
            target_issue: stockProb.target_issue,
            suggested_time_minutes: stockProb.suggested_time_minutes || 70,
            fact_context: stockProb.fact_context,
            standard_norm: stockProb.standard_norm,
            statutes: stockProb.statutes || [],
          });
        }
      } catch (dbErr) {
        console.warn('DBストック取得スキップ:', dbErr);
      }
    }

    // 2. Gemini API 呼び出し
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'GEMINI_API_KEY が設定されていません。' },
        { status: 500 }
      );
    }

    const prompt = `
あなたは日本の司法試験および予備試験の論文式試験考査委員です。
以下の指定条件に基づき、70分間の本番起案にふさわしい、事実関係と設問が100%整合した事例問題を作成してください。

【設定条件】
- 科目: ${subject}
- 出題年度: ${year}
- 出題論点: 【${issueName}】
- 出題形式: ${isKaidai ? '司法試験・予備試験の過去問をベースに、事実関係や過失・共犯関係を改変した実戦改題' : '本試験の出題傾向に即した過去問再現問題'}

【絶対遵守の作問ルール（キメラ・事実不整合の厳禁）】
1. 事実関係（各段落）は、必ず指定論点【${issueName}】を検討・論証するために必要な具体的な生の事実のみで構成してください。
   ※重大注意：論点と無関係な「空き巣・店舗侵入・金庫の金奪取」などの定型文を使い回すことは固く禁じます。
   例えば、論点が放火罪であれば放火・火災に至る具体的な行為や延焼の経過を、不能犯であれば対象の性状や用いた手段の危険性を、詐欺罪であれば欺罔行為と交付行為を、事実関係の中に時系列で克明に記述してください。
2. fact_context は、１、２、３...の段落番号を付して時系列の生起事実を記述し、末尾に【設問】を配置してください。
3. 答案作成に直結する表現で、確立した判例の規範定立およびあてはめ基準（考慮要素）を standard_norm に明示してください。

必ず以下のキーを持つJSONオブジェクトのみを出力してください（Markdown記法のバッククォート \`\`\`json 等は含めないでください）。
{
  "source_exam": "${year} 予備試験${isKaidai ? '改題' : ''}",
  "target_issue": "${issueName}",
  "suggested_time_minutes": 70,
  "fact_context": "事実関係の文字列（段落１、２、３...および末尾の【設問】）",
  "standard_norm": "【判例の規範定立】\\n...\\n【当てはめ基準】\\n...",
  "statutes": [
    { "title": "根拠条文名", "text": "条文の内容" }
  ]
}
`;

    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key=${apiKey}`;

    const res = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { response_mime_type: 'application/json' },
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Gemini API エラー (${res.status}): ${errText}`);
    }

    const resJson = await res.json();
    const rawText = resJson.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawText) {
      throw new Error('AIからの応答テキストが空でした。');
    }

    const parsed = JSON.parse(rawText);
    return NextResponse.json(parsed);
  } catch (err: any) {
    console.error('作問APIエラー:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}