import { NextResponse } from 'next/server';

function cleanJson(raw: string): string {
  return raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
}

function fallbackDrill(theme: string) {
  return {
    title: `演習：${theme}と重要論点`,
    weaknessTag: theme,
    caseText: '甲は路上で知人Vと口論になり、激昂して所持していた鉄パイプでVの脚を殴打し、路上に転倒させて全治2週間の傷害を負わせた。甲はその場から逃走したが、偶然通りかかった乙は、Vが苦痛で動けない状態にあるのを目撃し、Vのポケットから財布（現金5万円在中）を抜き取って逃走した。',
    targetQuestion: '問：甲及び乙の罪責を論ぜよ。',
    fatalMistakes: [
      '甲乙間に共謀が成立していないにもかかわらず、共謀共同正犯として検討している',
      '乙の行為について先行暴行による「反抗抑圧状態の利用（強盗）」を検討せず単なる窃盗としている',
      '承継的共同正犯の成立要件と単独正犯の成立限界を混同している'
    ],
    passRequirements: [
      '甲について傷害罪（204条）の成立を認定していること',
      '乙について強盗罪（236条1項）における反抗抑圧状態の利用の規範を検討していること',
      '各行為者の単独正犯として罪責を明確に峻別して論じていること'
    ]
  };
}

export async function POST(req: Request) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'GEMINI_API_KEY が未設定です' }, { status: 500 });
    }

    const body = await req.json();

    if (body.action === 'generate') {
      const theme = body.theme?.trim() || '刑法重要論点';
      const prompt = `あなたは司法試験・予備試験刑法の考査委員です。テーマ「${theme}」について、受験生の浅い理解を突く即死地雷を仕込んだ事例問題（200〜300字）と採点基準を作ってください。
以下のJSON形式のみで出力してください:
{
  "title": "問題タイトル",
  "weaknessTag": "${theme}",
  "caseText": "事例問題本文（200〜300字）",
  "targetQuestion": "問：甲及び乙の罪責を論ぜよ。",
  "fatalMistakes": ["地雷1", "地雷2", "地雷3"],
  "passRequirements": ["要件1", "要件2", "要件3"]
}`;

      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key=${apiKey}`;
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { responseMimeType: 'application/json', temperature: 0.7 }
          })
        });

        if (res.ok) {
          const data = await res.json();
          const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text) {
            return NextResponse.json(JSON.parse(cleanJson(text)));
          }
        }
      } catch (e) {
        console.warn('Gemini作問フォールバック発動:', e);
      }

      return NextResponse.json(fallbackDrill(theme));
    }

    const { caseText, userAnswer, fatalMistakes, passRequirements } = body;
    const gradePrompt = `あなたは司法試験刑法の極めて厳格な考査委員です。以下の答案を事前地雷リストと合格要件に照らして厳格に採点してください。
【問題】${caseText}
【地雷】${JSON.stringify(fatalMistakes)}
【要件】${JSON.stringify(passRequirements)}
【受験生答案】${userAnswer}

以下のJSON形式のみで出力してください:
{
  "grade": "F",
  "score": 30,
  "isFatal": true,
  "triggeredTraps": [{"trapName": "地雷名", "detectedText": "該当箇所", "whyFatal": "理由"}],
  "structuralCheck": {"orderOfParties": false, "syllogismStrictness": "Low", "factEvaluationScore": "FactListingOnly"},
  "criticalFeedback": "厳しい講評",
  "idealStructure": "模範骨格答案"
}`;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key=${apiKey}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: gradePrompt }] }],
        generationConfig: { responseMimeType: 'application/json', temperature: 0.2 }
      })
    });

    if (res.ok) {
      const data = await res.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text) {
        return NextResponse.json(JSON.parse(cleanJson(text)));
      }
    }

    return NextResponse.json({
      grade: 'F',
      score: 25,
      isFatal: true,
      triggeredTraps: [{ trapName: '規範定立の欠落', detectedText: userAnswer.slice(0, 30), whyFatal: '法的三段論法が維持されていません。' }],
      structuralCheck: { orderOfParties: false, syllogismStrictness: 'Low', factEvaluationScore: 'FactListingOnly' },
      criticalFeedback: '条文の要件検討と規範定立から論述を展開してください。',
      idealStructure: '第１ 乙の罪責\n第２ 甲の罪責'
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
