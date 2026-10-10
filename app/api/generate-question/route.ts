import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: Request) {
  try {
    const { subject, year, mode, targetIssue } = await req.json();
    const isKaidai = mode === 'kaidai';
    const issueName = targetIssue || `${subject || '刑法'}の最重要論点`;

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    // 🌟 1. Supabaseの事前ストック（バッチ生成分）があれば0秒即時返却
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
          console.log(`⚡ Supabaseキャッシュから即時返却: ${issueName}`);
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

    // 🌟 2. バッチで動作確認済みの gemini-3.8-flash のみを直叩き
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

【絶対遵守の作問ルール】
1. 事実関係（各段落）と設問の指示は100%整合させてください。
   - 設問で論述を求める論点（${issueName}）については、必ず事実関係の中にあてはめの根拠となる具体的言動・客観的事実を記載してください。
2. fact_context は、時系列に沿った段落（１、２、３...）で生の事実を記述し、最終段落に【設問】を配置してください。
3. 答案作成に直結する表現で、判例の規範定立および当てはめ基準を明示してください。

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