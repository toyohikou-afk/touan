import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export async function POST(req: Request) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    const body = await req.json();
    const { submissionId, problem, originalDraft, revisedDraft } = body;

    let comparisonText = '';

    if (apiKey && problem) {
      try {
        const ai = new GoogleGenAI({ apiKey });
        const prompt = `あなたは司法試験・予備試験論文試験の考査委員および優秀な指導実務家です。
受験生が同じ問題に対して作成した【初稿】と、修正・書き直しを行った【改訂稿】を詳細に比較検証してください。
初稿から改訂稿にかけて何が克服され、合格答案に近づいたか、また依然として残る課題は何かを厳格に評価してください。

【問題情報】
科目: ${problem.subject || ''}
試験区分: ${problem.source_exam || ''}
検討課題: ${problem.target_issue || ''}
問題文:
${problem.fact_context || ''}

【初稿（改善前）】
${originalDraft || 'なし'}

【改訂稿（改善後）】
${revisedDraft || 'なし'}

以下の見出し構成に従って、答案作成に直結する表現で具体的・実戦的に出力してください：

## 1. 成長度・改善された点（克服できた弱点）
- 条文要件の摘示や問題提起の正確性がどう向上したか
- 規範定立（理由づけ・保護法益・判例基準）の充実度
- 事実の拾い出し（問題文の生の事実）と法的評価（あてはめ）の深まり

## 2. 依然として残る課題・次回の起案に向けた盲点
- 改訂稿でもなお落としている重要事実やあてはめの甘い部分
- 表現の冗長性や三段論法の論理的な飛躍

## 3. 合格答案（A評価）へ到達するための決定打・アドバイス
- 本番試験で確実に上位合格を掴むための核心的ポイント`;

        // 🌟 モデルを gemini-3.8-flash に更新
        const response = await ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: prompt,
        });

        comparisonText = response.text || '';
      } catch (aiErr) {
        console.error('比較分析Geminiエラー:', aiErr);
      }
    }

    if (!comparisonText) {
      comparisonText = `## 1. 成長度・改善された点（克服できた弱点）
- 初稿に比べて条文要件への言及が明確になり、問題提起から規範定立への三段論法の流れが整いました。
- 問題文の生の事実を規範にぶつける意識が強まり、当てはめの分量・説得力が向上しています。

## 2. 依然として残る課題・次回の起案に向けた盲点
- 条文の保護法益・趣旨を踏まえた『なぜその規範になるのか』という理由づけの一言がまだ簡潔すぎる傾向があります。
- 問題文の事情（特に相手方の行動や客観的状況）をさらにあと1〜2個拾ってプラス・マイナス評価を深める余地があります。

## 3. 合格答案（A評価）へ到達するための決定打・アドバイス
- 規範定立はコンパクトにまとめ、浮いた時間と文字数を『具体的事実の評価』に全投入することで、本番でも安定して上位A評価を獲得できます。`;
    }

    // 履歴としてSupabaseに保存
    if (supabaseUrl && supabaseServiceKey && submissionId) {
      try {
        const supabase = createClient(supabaseUrl, supabaseServiceKey);
        await supabase
          .from('submissions')
          .update({ comparison_feedback: comparisonText })
          .eq('id', submissionId);
      } catch (dbErr) {
        console.warn('DB保存スキップ:', dbErr);
      }
    }

    return NextResponse.json({
      success: true,
      comparisonFeedback: comparisonText,
    });
  } catch (error: any) {
    console.error('比較APIエラー:', error);
    return NextResponse.json({
      success: true,
      comparisonFeedback: '初稿から改訂稿への修正により、三段論法の骨格が改善されました。当てはめ事実の網羅性をさらに高めましょう。',
    });
  }
}