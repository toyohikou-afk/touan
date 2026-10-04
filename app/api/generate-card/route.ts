import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export async function POST(req: Request) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'GEMINI_API_KEY が未設定です。' }, { status: 500 });
    }

    const { problem, feedbackText, userDraft } = await req.json();

    const prompt = `あなたは司法試験・予備試験の論文添削および論証カード作成の専門家です。
以下の設問情報、受験者答案、AI講評から、実戦的な【論証カード用JSONデータ】を生成してください。
マークダウンコードブロック（\`\`\`json 等）や解説文は一切出力せず、純粋なJSON文字列のみを出力してください。

【最重要ルール】
「target_issue_full」には、抽象的な要約タイトルではなく、以下の【問題文全体（事実関係）】の全文を改行等も含めてそのまま完全に格納してください。要約や省略は禁止です。

【問題情報】
科目: ${problem.subject}
問題区分: ${problem.source_exam}
問題文全体（事実関係）:
${problem.fact_context}

【受験者答案】
${userDraft}

【AI講評内容】
${feedbackText}

【出力JSONフォーマット】
{
  "subject": "${problem.subject}",
  "source_exam": "${problem.source_exam}",
  "target_issue_full": ${JSON.stringify(problem.fact_context)},
  "norm": "答案に書くべき正確な判例規範（要件・規範定立）",
  "reasoning": "規範を導く理由づけ・条文の趣旨",
  "application_criteria": "本問の事実を規範にあてはめる際の具体的考慮要素・判断基準",
  "key_facts_extracted": [
    {
      "fact": "問題文から拾うべき具体的事実",
      "legal_evaluation": "その事実に対する法的位置づけ・評価"
    }
  ],
  "weak_point_memo": "受験者の起案において落とした重要事実やあてはめの改善点",
  "model_phrase": "本番答案のあてはめで使える実戦的な決まり文句・評価フレーズ"
}`;

    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: 'gemma-4-26b-a4b-it',
      contents: prompt,
    });

    const raw = response.text || '';
    const cleaned = raw.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim();
    const cardData = JSON.parse(cleaned);

    // 確実に問題文全文が入るようにフォールバック担保
    if (!cardData.target_issue_full || cardData.target_issue_full.length < 50) {
      cardData.target_issue_full = problem.fact_context;
    }

    // Supabaseへの自動保存
    if (supabaseUrl && supabaseServiceKey) {
      try {
        const supabase = createClient(supabaseUrl, supabaseServiceKey);
        await supabase.from('study_cards').insert({
          subject: cardData.subject,
          theme: cardData.target_issue_full,
          norm: cardData.norm,
          reasoning: cardData.reasoning,
          card_data: cardData,
          created_at: new Date().toISOString(),
        });
      } catch (dbErr) {
        console.warn('study_cards 保存スキップ:', dbErr);
      }
    }

    return NextResponse.json({ success: true, card: cardData });
  } catch (error: any) {
    console.error('論証カードJSON生成例外:', error);
    return NextResponse.json({ error: error.message || '生成失敗' }, { status: 500 });
  }
}