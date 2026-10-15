import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

function checkAdminAuth(req: Request): boolean {
  const { searchParams } = new URL(req.url);
  const adminParam = searchParams.get('admin');
  return !!adminParam && adminParam === process.env.ADMIN_SECRET_KEY;
}

// 1. 新規作成 (POST)
export async function POST(req: Request) {
  if (!checkAdminAuth(req)) {
    return NextResponse.json({ error: '認証エラー：管理権限がありません。' }, { status: 401 });
  }

  try {
    const body = await req.json();

    // 既存の anki テーブルの型定義に100%一致させる
    const newRecord = {
      id: body.id || crypto.randomUUID(), // text型のIDを自動生成
      subject: body.subject || '刑法',
      theme: body.theme || '',
      question: body.question,
      answer: body.answer,
      logic_rule: body.logic_rule || '',
      reference: body.reference || '',
      category: body.category || '重要論点',
      importance: body.importance || 'A',
      tags: Array.isArray(body.tags) ? body.tags : (body.tag ? [body.tag] : ['刑法']),
      created_at: new Date().toISOString()
    };

    const { data, error } = await supabaseAdmin.from('anki').insert(newRecord).select();

    if (error) {
      console.error('Supabase Error:', error);
      return NextResponse.json({ error: `Supabaseエラー: ${error.message}` }, { status: 400 });
    }

    return NextResponse.json({ success: true, data });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// 2. 更新 (PUT)
export async function PUT(req: Request) {
  if (!checkAdminAuth(req)) {
    return NextResponse.json({ error: '認証エラー：管理権限がありません。' }, { status: 401 });
  }

  try {
    const { id, tag, ...updates } = await req.json();
    if (!id) {
      return NextResponse.json({ error: 'IDが指定されていません。' }, { status: 400 });
    }

    if (tag && !updates.tags) {
      updates.tags = [tag];
    }

    const { data, error } = await supabaseAdmin
      .from('anki')
      .update(updates)
      .eq('id', id)
      .select();

    if (error) {
      return NextResponse.json({ error: `Supabaseエラー: ${error.message}` }, { status: 400 });
    }

    return NextResponse.json({ success: true, data });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// 3. 削除 (DELETE)
export async function DELETE(req: Request) {
  if (!checkAdminAuth(req)) {
    return NextResponse.json({ error: '認証エラー：管理権限がありません。' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'IDが指定されていません。' }, { status: 400 });
    }

    const { error } = await supabaseAdmin.from('anki').delete().eq('id', id);

    if (error) {
      return NextResponse.json({ error: `Supabaseエラー: ${error.message}` }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
