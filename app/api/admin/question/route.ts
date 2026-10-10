import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// RLSをバイパスできるサーバー専用のSupabaseクライアント
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// 認証チェック共通関数
function checkAuth(req: Request) {
  const passcode = req.headers.get('x-admin-passcode');
  return passcode && passcode === process.env.ADMIN_PASSCODE;
}

// 問題の更新 (PUT)
export async function PUT(req: Request) {
  try {
    if (!checkAuth(req)) {
      return NextResponse.json({ error: '認証に失敗しました' }, { status: 401 });
    }

    const body = await req.json();
    const { id, question_text, answer, subject, year, question_num, explanation_a, explanation_b, explanation_c, explanation_d, explanation_e } = body;

    if (!id) {
      return NextResponse.json({ error: '問題IDが必要です' }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from('tantou_questions')
      .update({
        question_text,
        answer,
        subject,
        year,
        question_num,
        explanation_a: explanation_a || '',
        explanation_b: explanation_b || '',
        explanation_c: explanation_c || '',
        explanation_d: explanation_d || '',
        explanation_e: explanation_e || '',
      })
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// 問題の削除 (DELETE)
export async function DELETE(req: Request) {
  try {
    if (!checkAuth(req)) {
      return NextResponse.json({ error: '認証に失敗しました' }, { status: 401 });
    }

    const { id } = await req.json();

    if (!id) {
      return NextResponse.json({ error: '問題IDが必要です' }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from('tantou_questions')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}