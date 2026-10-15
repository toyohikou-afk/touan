// app/drill/page.tsx
'use client';

import React, { useState } from 'react';
import { EssayGradingReport } from '../../components/EssayGradingReport';
import { GradeResult } from '../../types/grading';

const DRILL_PRESETS = [
  {
    id: 'robbery-profit',
    theme: '強盗利得罪（236条2項）と1項強盗の峻別',
    title: '演習1：債務免脱と暴行脅迫の因果性',
    weaknessTag: '強盗利得罪（236条2項）/ 処分行為の要否 / 反抗抑圧状態の利用',
    caseText: `甲は、知人Vに対する500万円の借金返済を免れようと考え、知人乙に相談した。乙は「2人で刃物で脅して『甲とVの間には一切の債権債務関係はない』という念書をVに書かせよう」と提案し、甲は「絶対に手は出すな」と念を押して了承した。
数日後、甲と乙はV方を訪れ、甲が用意したサバイバルナイフを突きつけて要求したが、Vは拒絶した。乙は立腹し、「迷惑料として10万円払え」と言って胸ぐらを掴み、Vの喉元にナイフを突き付けた。Vは恐怖で抵抗できなくなり、債権放棄の念書を作成して手渡した。
甲は「もうやめよう」と乙を引っ張って外へ連れ出し、ナイフを取り上げて立ち去った。しかし乙は直後に単身V宅に戻り、恐怖で腰を抜かしているVの机上から現金10万円を抜き取って逃走した。`,
    targetQuestion: '問：甲及び乙の罪責を論ぜよ（住居侵入罪を除く）。',
    fatalMistakes: [
      '念書の強取を1項強盗（財物強取）として処理し、2項強盗罪（強盗利得罪）を論じていない',
      '実行正犯（乙）の客観的罪責を確定させる前に、甲から検討を開始している',
      '10万円強取について「共謀の射程外」であることを検討せず、いきなり離脱の成否のみを論じている'
    ],
    passRequirements: [
      '乙の念書作成について強盗利得罪（236条2項）の成立を認定していること',
      '乙の10万円抜き取りについて反抗抑圧状態の利用による強盗罪（236条1項）の成立を認定していること',
      '甲について、念書作成への共謀共同正犯（60条、236条2項）を論じていること',
      '甲について、10万円強取が共謀の射程外（または離脱）である論理を展開していること'
    ]
  },
  {
    id: 'conspiracy-withdrawal',
    theme: '共謀の射程 vs 着手後離脱（因果性遮断）',
    title: '演習2：空き巣計画における共犯者の暴走と現場離脱',
    weaknessTag: '共謀の射程 / 着手後離脱の要件（心理的・物理的因果性の遮断）',
    caseText: `甲と乙は、深夜に不在中のV宅に侵入して金品を盗み出すことを計画した。甲は侵入用バールを乙に手渡し、自らは見張り役を務めることとした。
乙がV宅に侵入して物色していたところ、予期せず帰宅した家主Vと鉢合わせた。乙は逮捕を免れるため、持っていたバールでVの頭部を強打し、全治1か月の重傷を負わせた。
大きな物音とVの悲鳴を聞いた甲は、乙の暴走に恐怖を感じ、「これ以上は無理だ、俺は抜ける」と乙にLINEメッセージを送信し、その場から一人で立ち去った。
乙はその後、失神したVの財布から現金50万円を強取して逃走した。`,
    targetQuestion: '問：甲及び乙の罪責を論ぜよ（住居侵入罪を除く）。',
    fatalMistakes: [
      '乙の強盗致傷罪（240条）の成立を確定させる前に甲から検討を開始している',
      '乙の強盗致傷行為について「共謀の射程」を検討せず、いきなり離脱のみを論じている',
      '甲の離脱についてLINE送信のみで肯定し、凶器（バール）の物理的効用残存やVの反抗抑圧状態の継続を無視している'
    ],
    passRequirements: [
      '乙について強盗致傷罪（事後強盗致傷罪、238条・240条前段）の成立を論じていること',
      '窃盗共謀から強盗致傷行為への共謀の射程の及ぶ範囲（予期可能性・危険の現実化）を検討していること',
      '着手後離脱の規範（物理的・心理的因果性の消滅）を定立し、バール提供等の因果性が残存している事実を適切に評価していること'
    ]
  },
  {
    id: 'successive-joint-principal',
    theme: '承継的共同正犯（先行行為の帰責）',
    title: '演習3：途中加担と先行結果の帰責関係',
    weaknessTag: '承継的共同正犯 / 因果的共犯論 / 強盗致傷罪における結果の帰責',
    caseText: `甲は路上で知人Vと口論になり、激怒してVの顔面や腹部を激しく殴打・足蹴にし、Vに肋骨骨折等の重傷を負わせて路上に倒れ込ませた。
そこへ通りかかった友人乙は、倒れているVを見て「いい気味だ、俺も手伝うよ」と甲に申し出た。甲は「じゃあ財布を奪おう」と答え、乙は「分かった」と了承した。
乙は倒れてうめいているVの背中を1回蹴りつけ、甲がVのポケットから現金10万円の入った財布を抜き取るのを手伝った。`,
    targetQuestion: '問：甲及び乙の罪責を論ぜよ。',
    fatalMistakes: [
      '乙について「承継的共同正犯」の成否を明示的に論じず、全体を単純な共同正犯として処理している',
      '乙の加担前に生じていた傷害結果について、因果的共犯論に反して乙にそのまま帰責させている',
      '甲の先行暴行による反抗抑圧状態を利用した奪取の法的性質（強盗罪）を論じていない'
    ],
    passRequirements: [
      '先行行為者甲について強盗致傷罪（240条前段）の成立を論じていること',
      '途中加担者乙について承継的共同正犯の規範（自己の加担が先行結果に因果的寄与を与え得ないこと）を正確に定立していること',
      '乙には加担前の傷害結果は帰責されず、暴行及び強盗罪（236条1項）の限度で共同正犯が成立する論理を展開していること'
    ]
  }
];

export default function DrillPage() {
  const [drill, setDrill] = useState(DRILL_PRESETS[0]);
  const [customTheme, setCustomTheme] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  const [userAnswer, setUserAnswer] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [gradingResult, setGradingResult] = useState<GradeResult | null>(null);

  // プリセット問題の切り替え
  const handleSelectPreset = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const targetDrill = DRILL_PRESETS.find((p) => p.id === e.target.value);
    if (targetDrill) {
      setDrill(targetDrill);
      setGradingResult(null);
      setUserAnswer('');
      setError(null);
    }
  };

  // AIによる新作問題の安全生成
  const handleGenerateCustomDrill = async () => {
    setIsGenerating(true);
    setError(null);

    try {
      const res = await fetch('/api/grade-essay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'generate',
          theme: customTheme || '刑法総論・各論の予備試験重要論点',
        }),
      });

      const rawText = await res.text();
      let data;
      try {
        data = JSON.parse(rawText);
      } catch {
        throw new Error(`サーバーから不正なレスポンスを受信しました（HTTP ${res.status}）。再試行してください。`);
      }

      if (!res.ok) {
        throw new Error(data.error || `エラーが発生しました (${res.status})`);
      }

      setDrill(data);
      setGradingResult(null);
      setUserAnswer('');
      setCustomTheme('');
    } catch (err: unknown) {
      console.error(err);
      setError(err instanceof Error ? err.message : '新作問題の生成に失敗しました');
    } finally {
      setIsGenerating(false);
    }
  };

  // 答案の提出・採点
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userAnswer.trim()) {
      setError('答案を入力してください。');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/grade-essay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'grade',
          caseText: drill.caseText,
          userAnswer: userAnswer,
          fatalMistakes: drill.fatalMistakes,
          passRequirements: drill.passRequirements,
        }),
      });

      const rawText = await response.text();
      let data: GradeResult;
      try {
        data = JSON.parse(rawText);
      } catch {
        throw new Error(`採点サーバーから不正なレスポンスを受信しました（HTTP ${response.status}）`);
      }

      if (!response.ok) {
        throw new Error((data as unknown as { error?: string }).error || `HTTPエラー: ${response.status}`);
      }

      setGradingResult(data);
    } catch (err: unknown) {
      console.error(err);
      setError(err instanceof Error ? err.message : '予期せぬエラーが発生しました');
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setGradingResult(null);
    setUserAnswer('');
    setError(null);
  };

  return (
    <div className="min-h-screen bg-slate-100 py-8 px-4 sm:px-6 lg:px-8 text-slate-800">
      <div className="max-w-7xl mx-auto space-y-6">
        <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-4">
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              予備試験 刑法 実戦起案ドリル
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              地雷トラップ自動検知・法的三段論法 リアルタイム採点エンジン
            </p>
          </div>
          {gradingResult && (
            <button
              onClick={handleReset}
              className="mt-3 sm:mt-0 px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-lg shadow-sm transition"
            >
              別の答案を書き直す
            </button>
          )}
        </header>

        {/* コントロールエリア */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col justify-between space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              ① 定番・頻出問題から選ぶ:
            </span>
            <select
              onChange={handleSelectPreset}
              className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600"
            >
              {DRILL_PRESETS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.theme}
                </option>
              ))}
            </select>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-600">
              ② AIに新作問題を作成させる:
            </span>
            <div className="flex gap-2">
              <input
                type="text"
                value={customTheme}
                onChange={(e) => setCustomTheme(e.target.value)}
                placeholder="例: 横領と背任、不能犯、間接正犯 など"
                className="flex-1 p-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
              <button
                onClick={handleGenerateCustomDrill}
                disabled={isGenerating}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 text-white text-xs font-bold rounded-lg shadow-sm whitespace-nowrap transition"
              >
                {isGenerating ? '作問中（数秒）...' : '🎲 新作作成'}
              </button>
            </div>
          </div>
        </div>

        {error && (
          <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl font-mono leading-relaxed">
            {error}
          </div>
        )}

        {/* 演習事例カード */}
        <section className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-2.5 py-1 bg-blue-100 text-blue-800 text-xs font-bold rounded-md">
              演習事例
            </span>
            <span className="px-2.5 py-1 bg-slate-100 text-slate-600 text-xs font-medium rounded-md">
              重点テーマ: {drill.weaknessTag}
            </span>
          </div>

          <h2 className="text-lg font-bold text-slate-900">{drill.title}</h2>

          <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg text-sm leading-relaxed text-slate-800 font-serif whitespace-pre-wrap">
            {drill.caseText}
          </div>

          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm font-bold text-amber-900">
            {drill.targetQuestion}
          </div>
        </section>

        {/* 答案入力エリア */}
        {!gradingResult && (
          <section className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-600">
                答案作成エリア
              </h3>
              <span className="text-xs font-mono text-slate-400">
                文字数: {userAnswer.length} 字
              </span>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <textarea
                value={userAnswer}
                onChange={(e) => setUserAnswer(e.target.value)}
                placeholder="第１ 乙の罪責&#10;１ 乙の行為について...&#10;&#10;※実行正犯から客観的罪責を確定させ、規範定立をしてから事実にあてはめてください。"
                rows={16}
                disabled={isLoading}
                className="w-full p-4 border border-slate-300 rounded-lg font-mono text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent disabled:bg-slate-50 disabled:text-slate-400"
              />

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={isLoading || !userAnswer.trim()}
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white text-sm font-bold rounded-lg shadow-sm flex items-center gap-2 transition"
                >
                  {isLoading ? '考査委員が採点中...' : '答案を提出して採点を受ける'}
                </button>
              </div>
            </form>
          </section>
        )}

        {/* 採点結果表示 */}
        {gradingResult && (
          <section className="space-y-6">
            <EssayGradingReport
              result={gradingResult}
              userAnswer={userAnswer}
            />
          </section>
        )}
      </div>
    </div>
  );
}