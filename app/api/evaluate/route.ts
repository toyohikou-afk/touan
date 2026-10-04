import { NextRequest } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'GEMINI_API_KEY が未設定です。' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json();
    const { problemId, problem, userDraft, timeSpentSeconds, userId, parentSubmissionId } = body;

    if (!userDraft || !problem) {
      return new Response(JSON.stringify({ error: '必須パラメータが不足しています。' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 司法試験・予備試験 採点・添削プロンプト
    const prompt = `あなたは司法試験・予備試験の論文試験考査委員および優秀な指導実務家です。
以下の設問、問題文、受験生の作成答案を厳格に照合し、合格答案の設計図（三段論法・保護法益・条文要件・あてはめ）に基づいた詳細な採点・添削講評をストリーミング出力してください。

【設問情報】
科目: ${problem.subject}
問題区分: ${problem.source_exam}
論点・テーマ: ${problem.target_issue}
問題文全体（事実関係）:
${problem.fact_context}

【受験者作成答案】
${userDraft}

【講評作成の必須構成】
以下の見出し構成に従って、具体的かつ実戦的に出力してください：

## 1. 総合評価・得点目安
- 推定評価（A〜F）および得点目安（本問における得点率）
- 合否を分けた最大のポイント（総評）

## 2. 三段論法の骨格・規範定立の検証
- 条文の文言・要件の摘示が正確か
- 規範定立の理由づけ（保護法益・条文の趣旨）が抜け落ちていないか
- 答案で定立した規範が判例通説に合致しているか

## 3. 事実の摘示と法的評価（あてはめ）の検証
- 問題文の具体的事実を漏れなく拾えているか
- 生の事実に対する法的評価（プラス評価・マイナス評価）が的確か
- 受験者が落とした重要事実の指摘

## 4. 具体的添削・改善アドバイス
- 答案のどの部分をどう書き直せば上位答案（A評価）になるかのリライト例
- 次回の起案に向けた思考手順のアドバイス`;

    const ai = new GoogleGenAI({ apiKey });
    const responseStream = await ai.models.generateContentStream({
      model: 'gemma-4-26b-a4b-it',
      contents: prompt,
    });

    const encoder = new TextEncoder();
    let accumulatedText = '';

    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of responseStream) {
            const text = chunk.text || '';
            accumulatedText += text;
            controller.enqueue(encoder.encode(text));
          }

          // ストリーミング完了後に Supabase へ非同期保存
          if (supabaseUrl && supabaseServiceKey && problemId) {
            try {
              const supabase = createClient(supabaseUrl, supabaseServiceKey);
              
              // 保存データの組み立て
              const insertPayload: any = {
                problem_id: problemId,
                user_draft: userDraft,
                time_spent_seconds: timeSpentSeconds || null,
                user_id: userId || null,
                created_at: new Date().toISOString(),
              };

              // parent_submission_id が存在する場合のみ追加
              if (parentSubmissionId) {
                insertPayload.parent_submission_id = parentSubmissionId;
              }

              const { error: dbError } = await supabase
                .from('submissions')
                .insert(insertPayload);

              if (dbError) {
                // parent_submission_id カラム未作成エラー等の場合はカラムを除外してフォールバック保存
                if (dbError.code === 'PGRST204' || dbError.message?.includes('parent_submission_id')) {
                  delete insertPayload.parent_submission_id;
                  await supabase.from('submissions').insert(insertPayload);
                } else {
                  console.warn('submissions 保存警告:', dbError);
                }
              }
            } catch (dbErr) {
              console.warn('DB保存例外スキップ:', dbErr);
            }
          }

          controller.close();
        } catch (err: any) {
          console.error('ストリーミング送信例外:', err);
          controller.error(err);
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Transfer-Encoding': 'chunked',
        'Cache-Control': 'no-cache',
      },
    });
  } catch (error: any) {
    console.error('/api/evaluate 全体例外:', error);
    return new Response(JSON.stringify({ error: error.message || '採点処理に失敗しました' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}