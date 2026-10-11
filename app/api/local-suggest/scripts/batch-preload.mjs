// scripts/batch-preload.mjs
// 実行方法: node scripts/batch-preload.mjs
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'あなたのSUPABASE_URL';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'あなたのSERVICE_ROLE_KEY';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const TARGET_TASKS = [
  { subject: '刑法', year: '令和6年', issue: '共犯関係からの離脱' },
  { subject: '刑法', year: '令和5年', issue: '不能犯と未遂犯の区別' },
  { subject: '民法', year: '令和6年', issue: '動産二重譲渡と即時取得（192条）' },
  { subject: '行政法', year: '令和6年', issue: '建築確認留保の行政処分性' },
];

async function generateAndStore() {
  console.log('🚀 一括バッチ生成を開始します...');

  for (const task of TARGET_TASKS) {
    console.log(`生成中: ${task.subject} - ${task.issue}...`);

    const prompt = `
司法試験・予備試験70分起案用の問題を作成してください。
科目: ${task.subject}
年度: ${task.year}
論点: ${task.issue}
事実関係（１〜３）と設問を100%整合させ、次のJSON形式のみで出力してください。
{
  "source_exam": "${task.year} 予備試験改題",
  "target_issue": "${task.issue}",
  "fact_context": "１ ...\\n２ ...\\n３ ...\\n\\n【設問】...",
  "standard_norm": "【判例規範定立】...\\n【当てはめ基準】..."
}
`;

    try {
      const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key=${GEMINI_API_KEY}`;
      const res = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { response_mime_type: 'application/json' },
        }),
      });

      const resJson = await res.json();
      const parsed = JSON.parse(resJson.candidates[0].content.parts[0].text);

      // Supabaseに事前格納
      const { error } = await supabase.from('sub_problems').insert({
        subject: task.subject,
        source_exam: parsed.source_exam,
        target_issue: parsed.target_issue,
        suggested_time_minutes: 70,
        fact_context: parsed.fact_context,
        standard_norm: parsed.standard_norm,
        problem_type: 'preloaded_batch',
      });

      if (error) console.error('DB保存エラー:', error.message);
      else console.log(`✅ 格納完了: ${task.issue}`);
      
      // レート制限回避のためウェイト
      await new Promise((resolve) => setTimeout(resolve, 3000));
    } catch (err) {
      console.error(`❌ エラー (${task.issue}):`, err.message);
    }
  }

  console.log('✨ すべてのバッチ生成が完了しました！');
}

generateAndStore();