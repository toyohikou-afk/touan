// app/api/generate-drill/route.ts
import { NextResponse } from 'next/server';

const PRESET_DRILLS: Record<string, {
  title: string;
  weaknessTag: string;
  caseText: string;
  targetQuestion: string;
  fatalMistakes: string[];
  passRequirements: string[];
}> = {
  '強盗利得罪（236条2項）と1項強盗の峻別': {
    title: '演習：債務免脱と暴行脅迫の因果性',
    weaknessTag: '強盗利得罪（236条2項）と1項強盗の峻別',
    caseText: '甲はVに対する借金300万円の返済を免れようと企て、返済期日にV宅を訪問した。甲はVに対し包丁を突きつけ「借金をチャラにしろ。警察に言ったら殺す」と脅迫した。Vは恐怖のあまり「分かった、もう返さなくていい」と口頭で承諾した。甲は安心し、その場にあったVの財布から現金5万円を抜き取って逃走した。',
    targetQuestion: '問：甲の罪責を論ぜよ（住居侵入罪を除く）。',
    fatalMistakes: [
      '口頭の債務免除について2項強盗の処分行為不要・必要説を論じていない',
      '現金5万円の強取について反抗抑圧状態の利用（1項強盗）を検討せず窃盗罪としている',
      '1項強盗と2項強盗の罪数処理（併合罪）を落としている'
    ],
    passRequirements: [
      '口頭の債務免除が236条2項の「財産上不法の利益」にあたるかを検討していること',
      '先行脅迫による反抗抑圧状態を利用した現金奪取に1項強盗罪の成立を認めていること',
      '両者の罪数関係（併合罪）に言及していること'
    ]
  },
  '共謀の射程 vs 着手後離脱（因果性遮断）': {
    title: '演習：現場での共犯者の暴走と離脱の成否',
    weaknessTag: '共謀の射程 vs 着手後離脱（因果性遮断）',
    caseText: '甲と乙はV宅への空き巣（窃盗）を共謀し侵入した。物色中、帰宅したVに鉢合わせたため、乙は突如持参していた特殊警棒でVを殴打し気絶させた。甲は「そんなの聞いてない、もうやめる」と告げて何も取らずに逃走した。乙はその直後、気絶したVの机上から現金20万円を強取した。',
    targetQuestion: '問：甲及び乙の罪責を論ぜよ（住居侵入罪を除く）。',
    fatalMistakes: [
      '乙の事後強盗または強盗罪の客観的成立を確定させる前に甲から論じている',
      '乙の暴行について甲の共謀の射程を検討せず、いきなり離脱のみで処理している',
      '共犯離脱における因果性の遮断（Vの反抗抑圧状態の解消努力）を論じていない'
    ],
    passRequirements: [
      '乙に強盗罪（または事後強盗罪）の成立を認定していること',
      '甲乙間の窃盗共謀から乙の強盗行為への共謀の射程の及ぶ範囲を論じていること',
      '甲の離脱について、心理的・物理的因果性が遮断されたかを事実に基づき評価していること'
    ]
  },
  '承継的共同正犯（先行行為の帰責）': {
    title: '演習：途中加担と先行結果の帰責',
    weaknessTag: '承継的共同正犯（先行行為の帰責）',
    caseText: '甲は路上で単身Vに激しい暴行を加え、Vに頭部骨折の重傷を負わせて路上に倒れ込ませた。そこへ通りかかった友人乙は事情を察し、「手伝うよ」と言って倒れているVの腹部をさらに数回蹴りつけた。その後、甲と乙はVのポケットから財布を抜き取って山分けした。',
    targetQuestion: '問：甲及び乙の罪責を論ぜよ。',
    fatalMistakes: [
      '乙について承継的共同正犯の成否を論じず、全体を単純共同正犯としている',
      '乙の加担前の傷害結果について因果的共犯論の観点から帰責を否定していない',
      '強盗罪における先行暴行状態の利用と承継の限界を混同している'
    ],
    passRequirements: [
      '先行行為者甲の強盗致傷罪の成立を論じていること',
      '途中加担者乙について承継的共同正犯の規範（因果的寄与の有無）を定立していること',
      '乙に先行の傷害結果は帰責されず、暴行および財物強取についてのみ限度で責任を負う論理を展開していること'
    ]
  }
};

export async function POST(req: Request) {
  try {
    const { weaknessTag } = await req.json();
    const tag = weaknessTag || '共謀の射程 vs 着手後離脱（因果性遮断）';
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      const fallback = PRESET_DRILLS[tag] || PRESET_DRILLS['共謀の射程 vs 着手後離脱（因果性遮断）'];
      return NextResponse.json(fallback);
    }

    const systemPrompt = [
      'あなたは予備試験・司法試験刑法の考査委員です。',
      '受験生の理解が浅いと必ず論理破綻を起こす「思考の罠」を仕込んだ短問（事例問題）と、その採点ルーブリックを生成してください。',
      '',
      '【問題作成の厳格ルール】',
      '1. 事例問題（caseText）は200〜300字程度の極めて簡潔な記述にすること。',
      '2. 登場人物は甲・乙・被害者Vの2〜3名に絞ること。',
      '3. 指定された弱点テーマについて、表面的な理解の受験生が引っかかるトラップを必ず1つ仕込むこと。',
      '4. 抵触すると即F判定（即死）となる地雷（fatalMistakes）を3点指定すること。',
      '5. 合格答案が必ず満たすべき要件（passRequirements）を3〜4点指定すること。'
    ].join('\n');

    const userPrompt = [
      `【重点弱点テーマ】: ${tag}`,
      '',
      '以下のJSON形式で出力してください（Markdown装飾なしの純粋なJSON文字列のみ）:',
      '{',
      '  "title": "問題のタイトル",',
      '  "weaknessTag": "テーマ名",',
      '  "caseText": "200〜300字の事例問題",',
      '  "targetQuestion": "問：甲及び乙の罪責を論ぜよ。",',
      '  "fatalMistakes": ["地雷1", "地雷2", "地雷3"],',
      '  "passRequirements": ["合格要件1", "合格要件2", "合格要件3"]',
      '}'
    ].join('\n');

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key=${apiKey}`;

    const geminiRes = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents: [{ parts: [{ text: userPrompt }] }],
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.7,
        },
      }),
    });

    if (geminiRes.ok) {
      const geminiData = await geminiRes.json();
      const rawText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
      return NextResponse.json(JSON.parse(rawText));
    }

    // Google APIが混雑または失敗時はプリセットを即座に返却
    const fallback = PRESET_DRILLS[tag] || PRESET_DRILLS['共謀の射程 vs 着手後離脱（因果性遮断）'];
    return NextResponse.json(fallback);
  } catch (error) {
    console.error('Generate Drill API Error:', error);
    const fallback = PRESET_DRILLS['共謀の射程 vs 着手後離脱（因果性遮断）'];
    return NextResponse.json(fallback);
  }
}