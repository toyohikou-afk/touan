import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { z } from 'zod';
import dotenv from 'dotenv';

// .env を読み込み
dotenv.config({ path: '.env.local' });
dotenv.config();

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ エラー: 環境変数 NEXT_PUBLIC_SUPABASE_URL または SUPABASE_SERVICE_ROLE_KEY が設定されていません。');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

const LawSubjectEnum = z.enum([
  '憲法',
  '行政法',
  '民法',
  '商法',
  '民事訴訟法',
  '刑法',
  '刑事訴訟法',
  '実務基礎_民事',
  '実務基礎_刑事',
  '選択科目',
]);

const SubProblemSchema = z.object({
  subject: LawSubjectEnum,
  source_exam: z.string().min(1),
  target_issue: z.string().min(1),
  fact_context: z.string().min(1),
  standard_norm: z.string().min(1),
  key_facts: z.array(z.string()).default([]),
  suggested_time_minutes: z.number().int().positive().default(15),
});

const ImportPayloadSchema = z.object({
  problems: z.array(SubProblemSchema),
});

async function importSubProblems(filePath: string) {
  const absolutePath = path.resolve(process.cwd(), filePath);
  console.log(`📂 JSONファイルを読み込み中: ${absolutePath}`);

  if (!fs.existsSync(absolutePath)) {
    console.error(`❌ ファイルが存在しません: ${absolutePath}`);
    process.exit(1);
  }

  let rawData: unknown;
  try {
    const fileContent = fs.readFileSync(absolutePath, 'utf-8');
    rawData = JSON.parse(fileContent);
  } catch (error) {
    console.error('❌ JSONのパースに失敗しました。構文を確認してください。', error);
    process.exit(1);
  }

  const parseResult = ImportPayloadSchema.safeParse(rawData);
  if (!parseResult.success) {
    console.error('❌ バリデーションエラー:');
    console.error(JSON.stringify(parseResult.error.format(), null, 2));
    process.exit(1);
  }

  const { problems } = parseResult.data;
  console.log(`✅ ${problems.length} 件の小問データを検証しました。Supabase への登録を開始します...`);

  try {
    const { data, error } = await supabase
      .from('sub_problems')
      .insert(problems)
      .select('id, target_issue, subject');

    if (error) {
      console.error('❌ Supabase 登録エラー:', error.message);
      console.error('詳細:', error.details);
      process.exit(1);
    }

    console.log(`🎉 登録完了! 合計 ${data.length} 件の小問が正常に登録されました。\n`);
    data.forEach((item, index) => {
      console.log(`  [${index + 1}] ID: ${item.id} | [${item.subject}] ${item.target_issue}`);
    });
  } catch (err) {
    console.error('❌ 予期しないエラーが発生しました:', err);
    process.exit(1);
  }
}

const targetFile = process.argv[2] || 'data/sub_problems.json';
importSubProblems(targetFile);