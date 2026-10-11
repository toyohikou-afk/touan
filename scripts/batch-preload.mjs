import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// .env.local から環境変数を簡易読み込み
const envPath = path.resolve(process.cwd(), '.env.local');
const env = {};
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf-8');
  content.split('\n').forEach(line => {
    const [k, ...v] = line.split('=');
    if (k && v.length) env[k.trim()] = v.join('=').trim().replace(/^["']|["']$/g, '');
  });
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY || env.SUPABASE_SERVICE_ROLE_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || env.GEMINI_API_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY || !GEMINI_API_KEY) {
  console.error('❌ 環境変数（.env.local）の読み込みに失敗しました。');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const TARGET_TASKS = [
  { subject: '刑法', year: '令和6年', issue: '共犯関係からの離脱' },
  { subject: '刑法', year: '令和5年', issue: '不能犯と未遂犯の区別' },
  { subject: '民法', year: '令和6年', issue: '動産二重譲渡と即時取得（192条）' },
  { subject: '行政法', year: '令和6年', issue: '建築確認留保の行政処分性' },
];

async function generateAndStore() {
  console.log('🚀 一括バッチ生成を開始します...');

  for (const task of TARGET_TASKS) {
    console.log(`\n⏳ 生成中: 【${task.subject}】 ${task.issue}...`);

    const prompt = `
司法試験・予備試験70分起案用の問題を作成してください。
科目: ${task.subject}
年度: ${task.year}
論点: ${task.issue}

【作問ルール】
1. 事実関係（１、２、３...）に現れた当事者の言動と、設問の論点を100%整合させてください。
2. 答案作成に直結する判例規範と当てはめ基準を明記してください。

以下のJSON形式のみを出力してください（Markdown記法は含めないでください）。
{
  "source_exam": "${task.year} 予備試験改題",
  "target_issue": "${task.issue}",
  "suggested_time_minutes": 70,
  "fact_context": "１ （事実）\\n２ （事実）\\n３ （事実）\\n\\n【設問】\\n各当事者の罪責（又は請求）について、上記事実に直結する論点（${task.issue}）を対象として論ぜよ。",
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

      if (!res.ok) {
        throw new Error(`APIステータス ${res.status}: ${await res.text()}`);
      }

      const resJson = await res.json();
      const rawText = resJson.candidates?.[0]?.content?.parts?.[0]?.text;
      const parsed = JSON.parse(rawText);

      const { error } = await supabase.from('sub_problems').insert({
        subject: task.subject,
        source_exam: parsed.source_exam,
        target_issue: parsed.target_issue,
        suggested_time_minutes: 70,
        fact_context: parsed.fact_context,
        standard_norm: parsed.standard_norm,
        problem_type: 'preloaded_batch',
      });

      if (error) {
        console.error('❌ Supabase保存エラー:', error.message);
      } else {
        console.log(`✅ Supabase格納完了: ${task.issue}`);
      }

      // レート制限防止のインターバル（3秒）
      await new Promise(r => setTimeout(r, 3000));
    } catch (err) {
      console.error(`❌ 作成失敗 (${task.issue}):`, err.message);
    }
  }

  console.log('\n🎉 すべてのバッチ生成処理が完了しました！');
}

generateAndStore();
