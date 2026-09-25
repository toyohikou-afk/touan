import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { prompt } = await req.json();
    
    const response = await fetch('http://127.0.0.1:11434/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'yobishiken-ai',
        prompt: prompt,
        stream: false
      }),
    });

    const data = await response.json();
    let text = data.response.trim();
    
    if (text.startsWith('```json')) text = text.replace(/^```json\n?/, '');
    if (text.startsWith('```')) text = text.replace(/^```\n?/, '');
    text = text.replace(/\n?```$/, '');

    try {
      return NextResponse.json(JSON.parse(text));
    } catch (e) {
      return NextResponse.json({ _warning: "JSON解析失敗", raw_text: text });
    }
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
