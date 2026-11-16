import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

// e-Gov 法令API v1 法令番号マッピング
const EGOV_LAW_IDS: Record<string, string> = {
  '憲法': '321CONSTITUTION',
  '民法': '129AC0000000089',
  '商法': '132AC0000000048',
  '会社法': '417AC0000000086',
  '民事訴訟法': '408AC0000000109',
  '刑法': '140AC0000000045',
  '刑事訴訟法': '323AC0000000131',
  '行政事件訴訟法': '337AC0000000139',
  '行政手続法': '405AC0000000088',
  '独占禁止法': '322AC0000000054',
};

// 漢数字 -> 算用数字 変換ユーティリティ（条番号正規化用）
function kanjiToNumber(kanjiStr: string): string {
  const map: Record<string, number> = {
    '〇': 0, '一': 1, '二': 2, '三': 3, '四': 4,
    '五': 5, '六': 6, '七': 7, '八': 8, '九': 9,
  };
  let result = 0;
  let temp = 0;

  for (const ch of kanjiStr) {
    if (ch in map) {
      temp = map[ch];
    } else if (ch === '十') {
      result += (temp === 0 ? 1 : temp) * 10;
      temp = 0;
    } else if (ch === '百') {
      result += (temp === 0 ? 1 : temp) * 100;
      temp = 0;
    } else if (ch === '千') {
      result += (temp === 0 ? 1 : temp) * 1000;
      temp = 0;
    }
  }
  result += temp;
  return result > 0 ? String(result) : kanjiStr;
}

// e-Gov XML内の「第百八条の二」等を「第108条の2」に変換
function normalizeArticleNum(rawKanjiNum: string): string {
  // 例: 第百八条の二 -> 108条の2
  return rawKanjiNum.replace(/([一二三四五六七八九十百千]+)/g, (match) => {
    return kanjiToNumber(match);
  });
}

// XMLタグ除去ヘルパー
function stripXmlTags(xml: string): string {
  return xml
    .replace(/<Rt>.*?<\/Rt>/g, '') // ルビ（ふりがな）を除去
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// e-Gov XML から全条文（本則）を抽出する軽量高速パーサー
function parseEgovLawXml(xmlText: string, lawName: string, lawId: string) {
  // 本則部分のみ抽出（附則の同番号条文との混在防止）
  const mainProvisionMatch = xmlText.match(/<MainProvision>([\s\S]*?)<\/MainProvision>/);
  const targetXml = mainProvisionMatch ? mainProvisionMatch[1] : xmlText;

  const articles: {
    law_name: string;
    law_id: string;
    article_num: string;
    article_num_kanji: string;
    article_title: string;
    article_text: string;
  }[] = [];

  const articleRegex = /<Article\b[^>]*>([\s\S]*?)<\/Article>/g;
  let match: RegExpExecArray | null;

  while ((match = articleRegex.exec(targetXml)) !== null) {
    const block = match[1];

    // 見出し: <ArticleCaption>（無権代理）</ArticleCaption>
    const captionMatch = block.match(/<ArticleCaption>([\s\S]*?)<\/ArticleCaption>/);
    const articleTitle = captionMatch ? stripXmlTags(captionMatch[1]) : '';

    // 条番号: <ArticleTitle>第百十三条</ArticleTitle>
    const titleMatch = block.match(/<ArticleTitle>([\s\S]*?)<\/ArticleTitle>/);
    const rawNum = titleMatch ? stripXmlTags(titleMatch[1]) : '';
    if (!rawNum) continue;

    const normalizedNum = normalizeArticleNum(rawNum);

    // 各項（Paragraph）の抽出
    const paragraphs: string[] = [];
    const paraRegex = /<Paragraph\b[^>]*>([\s\S]*?)<\/Paragraph>/g;
    let pMatch: RegExpExecArray | null;

    while ((pMatch = paraRegex.exec(block)) !== null) {
      const pBlock = pMatch[1];
      const pNumMatch = pBlock.match(/<ParagraphNum>([\s\S]*?)<\/ParagraphNum>/);
      const pNum = pNumMatch ? stripXmlTags(pNumMatch[1]) : '';

      const pSentenceMatch = pBlock.match(/<ParagraphSentence>([\s\S]*?)<\/ParagraphSentence>/);
      const pSentence = pSentenceMatch ? stripXmlTags(pSentenceMatch[1]) : '';

      // 号（Item）がある場合は追記
      const items: string[] = [];
      const itemRegex = /<Item\b[^>]*>([\s\S]*?)<\/Item>/g;
      let iMatch: RegExpExecArray | null;
      while ((iMatch = itemRegex.exec(pBlock)) !== null) {
        const iTitleMatch = iMatch[1].match(/<ItemTitle>([\s\S]*?)<\/ItemTitle>/);
        const iSentenceMatch = iMatch[1].match(/<ItemSentence>([\s\S]*?)<\/ItemSentence>/);
        const iTitle = iTitleMatch ? stripXmlTags(iTitleMatch[1]) : '';
        const iSentence = iSentenceMatch ? stripXmlTags(iSentenceMatch[1]) : '';
        if (iTitle || iSentence) {
          items.push(`  ${iTitle} ${iSentence}`.trim());
        }
      }

      const line = `${pNum ? pNum + ' ' : ''}${pSentence}`;
      paragraphs.push(items.length > 0 ? `${line}\n${items.join('\n')}` : line);
    }

    const articleText = paragraphs.join('\n');
    if (articleText) {
      articles.push({
        law_name: lawName,
        law_id: lawId,
        article_num: normalizedNum,
        article_num_kanji: rawNum,
        article_title: articleTitle,
        article_text: articleText,
      });
    }
  }

  return articles;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const law = searchParams.get('law') || '民法';
  const rawQuery = (searchParams.get('q') || '').trim();

  // 全角数字を半角に変換
  const normalizedQuery = rawQuery
    .replace(/[０-９]/g, (s) => String.fromCharCode(s.charCodeAt(0) - 0xfee0))
    .trim();

  try {
    // 1. 該当法令がすでに Supabase にキャッシュされているか確認
    const targetLaws = law === 'ALL' ? ['民法', '刑法', '会社法', '民事訴訟法', '刑事訴訟法', '憲法', '行政事件訴訟法'] : [law];

    for (const targetLaw of targetLaws) {
      const lawId = EGOV_LAW_IDS[targetLaw];
      if (!lawId) continue;

      const { count } = await supabase
        .from('statutes')
        .select('*', { count: 'exact', head: true })
        .eq('law_name', targetLaw);

      // 未キャッシュの場合は e-Gov 法令API から全条文を取得して保存
      if (!count || count === 0) {
        const egovUrl = `https://laws.e-gov.go.jp/api/1/lawdata/${lawId}`;
        const res = await fetch(egovUrl, { cache: 'no-store' });
        if (res.ok) {
          const xmlText = await res.text();
          const parsedArticles = parseEgovLawXml(xmlText, targetLaw, lawId);

          // 500件ずつチャンク分割して Supabase に一括保存
          for (let i = 0; i < parsedArticles.length; i += 500) {
            const chunk = parsedArticles.slice(i, i + 500);
            await supabase.from('statutes').upsert(chunk, { onConflict: 'law_name,article_num' });
          }
        }
      }
    }

    // 2. Supabase から検索実行
    let queryBuilder = supabase
      .from('statutes')
      .select('law_name, article_num, article_title, article_text')
      .limit(50);

    if (law !== 'ALL') {
      if (law === '商法') {
        queryBuilder = queryBuilder.in('law_name', ['商法', '会社法']);
      } else {
        queryBuilder = queryBuilder.eq('law_name', law);
      }
    }

    if (normalizedQuery) {
      // 数字のみ、または「108条」形式の場合は条番号優先検索
      const numOnly = normalizedQuery.replace(/[第条]/g, '');
      if (/^\d+(の\d+)?$/.test(numOnly)) {
        queryBuilder = queryBuilder.or(
          `article_num.ilike.%第${numOnly}条%,article_title.ilike.%${normalizedQuery}%,article_text.ilike.%${normalizedQuery}%`
        );
      } else {
        queryBuilder = queryBuilder.or(
          `article_title.ilike.%${normalizedQuery}%,article_text.ilike.%${normalizedQuery}%,article_num.ilike.%${normalizedQuery}%`
        );
      }
    }

    const { data, error } = await queryBuilder;
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const formatted = (data || []).map((row) => ({
      law: row.law_name,
      num: row.article_num,
      title: row.article_title,
      text: row.article_text,
    }));

    return NextResponse.json({ statutes: formatted });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : '法令検索エラー' },
      { status: 500 }
    );
  }
}
