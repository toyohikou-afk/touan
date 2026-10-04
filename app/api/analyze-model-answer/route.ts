import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const CANDIDATE_MODELS = [
  'gemini-3.8-flash',
  'gemini-1.5-pro',
  'gemini-1.5-flash'
];

export async function POST(req: Request) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    const body = await req.json();
    const { problem } = body;

    if (!problem) {
      return NextResponse.json({ error: '問題情報が不足しています。' }, { status: 400 });
    }

    let analysisResult: any = null;

    if (apiKey) {
      const prompt = `あなたは司法試験・予備試験の考査委員および最上位合格指導者です。
受験生が【完全な模範合格答案（A評価）を学習・写経し、核心フレーズを穴埋めで修得できるデータ】を作成し、JSON形式で出力してください。

【対象設問】
科目: ${problem.subject || '刑法'}
試験区分: ${problem.source_exam || '予備試験'}
論点: ${problem.target_issue || ''}
問題文:
${problem.fact_context || ''}

【必須要件】
1. full_model_answer: 本番試験で上位A評価を獲得する完全な模範答案（約1200〜1600字、ナンバリング・三段論法・生の事実のあてはめを徹底した完成稿）。
2. thinking_steps: 思考手順（4ステップ）。
3. dissected_segments: 模範答案をセンテンス単位で5分類（requirement / purpose / norm / application / conclusion）。
4. application_blueprint: 拾う生事実と法的評価の対比表。
5. cloze_tests: 答案の合否を分ける重要箇所（規範文言や事実評価）の穴埋め問題リスト（3〜5問、target_phrase: 問題文中のフレーズ、answer: 隠すべき重要語句、hint: ヒント）。

【出力JSONフォーマット】
{
  "pass_reason_summary": "配点の急所と上位合格の所以",
  "full_model_answer": "完全な模範答案全文（第１、１、(1)等の法曹実務ナンバリング付き）",
  "thinking_steps": [
    {"step": 1, "title": "事案分析と事実のマーク", "description": "解説"},
    {"step": 2, "title": "条文の選択と論点の確定", "description": "解説"},
    {"step": 3, "title": "判例規範の定立", "description": "解説"},
    {"step": 4, "title": "事実へのあてはめ設計", "description": "解説"}
  ],
  "dissected_segments": [
    {"type": "requirement", "text": "文案", "annotation": "解説"}
  ],
  "application_blueprint": [
    {"fact": "拾う事実", "evaluation": "法的評価"}
  ],
  "cloze_tests": [
    {"target_phrase": "急迫不正の侵害に対して、自己又は他人の権利を【 】するため", "answer": "防衛", "hint": "主観的防衛の要件"}
  ]
}`;

      const ai = new GoogleGenAI({ apiKey });

      for (const modelName of CANDIDATE_MODELS) {
        try {
          const response = await ai.models.generateContent({
            model: modelName,
            contents: prompt,
          });

          const raw = response.text || '';
          const jsonMatch = raw.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            if (parsed && parsed.full_model_answer) {
              analysisResult = parsed;
              break;
            }
          }
        } catch (err: any) {
          console.warn(`モデル ${modelName} 試行スキップ:`, err.message);
        }
      }
    }

    // フォールバック（API通信例外時も即座に学習可能）
    if (!analysisResult || !analysisResult.full_model_answer) {
      analysisResult = {
        pass_reason_summary: "条文要件（文言）の確定から出発し、法の保護法益を踏まえた規範を定立した上で、問題文の生の事実（客観的状況・主観的意図）を漏れなく拾って法的評価を行っている点が上位合格（A評価）たる所以です。",
        full_model_answer: `第１ 設問に対する検討
１ 本問における甲の行為について、該当する条文上の構成要件充足性を検討する。
(1) まず、本件行為が当該条文の要件に該当するかが問題となる。
(2) 思うに、同条の趣旨は、法益の不当な侵害を防止し、適正な法秩序の維持を図ることにある。
(3) したがって、当該要件に該当するか否かは、行為の具体的態様、侵害の危険性の程度、及び客観的相当性を総合考慮して判断すべきである。
２ これを本問についてみるに、甲は問題文記載の客観的状況下において本件行為に及んでいる。この事実は、法益侵害の現実的危険性を高める方向に働く。他方で、相手方の先行行為や時間的接着性等の事情も認められるが、全体としてみれば相当性の限度内にとどまる。
３ よって、甲の行為は要件を充足し、適法／違法と判断される。`,
        thinking_steps: [
          { step: 1, title: "事案分析と生の事実の抽出", description: "客観的数値や発言をプラス・マイナス評価に分類してマークする。" },
          { step: 2, title: "条文の文言要件の確定", description: "根拠条文を特定し、どの文言が争点となるかを提起する。" },
          { step: 3, title: "保護法益からの規範定立", description: "趣旨に立ち返り、判断の定規となる判例基準を定立する。" },
          { step: 4, title: "事実へのあてはめ設計", description: "生の事実を各考慮要素にぶつけて結論を導く。" }
        ],
        dissected_segments: [
          { type: "requirement", text: "第１ 甲の本件行為につき、構成要件該当性を検討する。", annotation: "条文要件の確定" },
          { type: "purpose", text: "思うに、本条の保護法益は個人の法益及び適正な法秩序の維持にある。", annotation: "保護法益・趣旨の明示" },
          { type: "norm", text: "したがって、行為の具体的態様、侵害の危険性の程度、客観的相当性を総合考慮して判断すべきである。", annotation: "判例規範の定立" },
          { type: "application", text: "本問において、甲は〜という客観的事情の下で行為に及んでおり、相当性の限度内にある。", annotation: "生の事実のあてはめ" },
          { type: "conclusion", text: "よって、甲の行為は要件を充足する。", annotation: "結論の明示" }
        ],
        application_blueprint: [
          { fact: "客観的数値・時間・凶器・距離", evaluation: "法益侵害の現実的危険性、行為態様の危険性を評価" },
          { fact: "当事者の発言・当時の認識", evaluation: "主観的意図・故意・防衛の意思を推認する事実として評価" }
        ],
        cloze_tests: [
          { target_phrase: "急迫不正の侵害に対して、自己又は他人の権利を【 】するため", answer: "防衛", hint: "主観的正当化要素" },
          { target_phrase: "行為の態様、法益侵害の危険性、結果発生の客観的【 】を総合考慮する", answer: "相当性", hint: "規範の考慮要素" }
        ]
      };
    }

    return NextResponse.json({
      success: true,
      analysis: analysisResult,
    });
  } catch (error: any) {
    console.error('アナトミーAPI例外:', error);
    return NextResponse.json({ error: '解析失敗' }, { status: 500 });
  }
}