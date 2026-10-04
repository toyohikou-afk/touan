'use client';

import { useEffect, useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

// デフォルト解剖モデル
const DEFAULT_ANATOMY = {
  pass_reason_summary:
    '条文要件（文言）の確定から出発し、法の保護法益を踏まえた規範を定立した上で、問題文の生の事実（客観的状況・主観的意図）を漏れなく拾って法的評価を行っている点が上位合格（A評価）たる所以です。',
  statutory_framework:
    '原則として条文の文言要件充足性を確認し、解釈上の疑義が生じる要件について実質的保護法益から例外・判断基準を定立する論理的枠組みです。',
  dissected_segments: [
    {
      type: 'requirement',
      text: '第１ 甲の本件行為につき、構成要件該当性を検討する。まず、本件行為が条文上の要件を充足するかが問題となる。',
      annotation: '【①条文要件・原則】何罪のどの文言・要件が問題となるのかを出発点として明確に摘示します。'
    },
    {
      type: 'purpose',
      text: '思うに、本条の保護法益は個人の法益及び適正な法秩序の維持にある。',
      annotation: '【②保護法益・趣旨】条文の趣旨・法益を明示することで、単なる暗記ではなく論理的必然性をもって規範を導きます。'
    },
    {
      type: 'norm',
      text: 'そうであるとすれば、当該要件の該当性は、行為の具体的態様、侵害の危険性の程度、客観的相当性を総合考慮して判断すべきである。',
      annotation: '【③定立規範】事実をぶつけるための「判断の定規（判例基準・考慮要素）」を明示します。'
    },
    {
      type: 'application',
      text: '本問において、甲は〜という客観的状況下で本件行為に及んでおり、これは法益侵害の現実的危険性を著しく高める態様といえる。また、〜という事情も認められる。',
      annotation: '【④事実摘示と評価】問題文の生の事実を具体的に拾い上げ、立てた規範の各考慮要素に丁寧にぶつけてプラス・マイナス評価を行います。'
    },
    {
      type: 'conclusion',
      text: 'したがって、甲の行為は上記要件を充足し、本罪が成立する。',
      annotation: '【結論】設問に対する明確な結論を簡潔に示して締めくくります。'
    }
  ]
};

export default function ReviewDetailPage() {
  const params = useParams();
  const submissionId = params.id as string;
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [submission, setSubmission] = useState<any>(null);
  const [parentSubmission, setParentSubmission] = useState<any>(null);
  const [problem, setProblem] = useState<any>(null);

  // 表示モード（review: 添削講評 / anatomy: 解剖 / compare: 前後対比）
  const [viewMode, setViewMode] = useState<'anatomy' | 'review' | 'compare'>('review');

  // アナトミーデータ
  const [anatomy, setAnatomy] = useState<any>(DEFAULT_ANATOMY);
  const [loadingAnatomy, setLoadingAnatomy] = useState(false);
  const [selectedSegment, setSelectedSegment] = useState<any>(DEFAULT_ANATOMY.dissected_segments[0]);

  // 前後対比フィードバック
  const [comparisonFeedback, setComparisonFeedback] = useState<string>('');
  const [loadingComparison, setLoadingComparison] = useState(false);

  const [deleting, setDeleting] = useState(false);

  // 文字拡大機能（小・中・大・特大）
  const [fontSizeLevel, setFontSizeLevel] = useState<1 | 2 | 3 | 4>(2);

  const fontSizeStyle = useMemo(() => {
    switch (fontSizeLevel) {
      case 1: return { fontSize: '13px', lineHeight: '22px' };
      case 2: return { fontSize: '15px', lineHeight: '26px' };
      case 3: return { fontSize: '18px', lineHeight: '32px' };
      case 4: return { fontSize: '22px', lineHeight: '40px' };
    }
  }, [fontSizeLevel]);

  // アナトミー取得
  const loadOrGenerateAnatomy = async (prob: any) => {
    setLoadingAnatomy(true);
    try {
      if (prob?.id) {
        const { data: cached } = await supabase
          .from('model_answer_anatomies')
          .select('*')
          .eq('problem_id', prob.id)
          .maybeSingle();

        if (cached && cached.dissected_segments && cached.dissected_segments.length > 0) {
          setAnatomy(cached);
          setSelectedSegment(cached.dissected_segments[0]);
          setLoadingAnatomy(false);
          return;
        }
      }

      const res = await fetch('/api/analyze-model-answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ problem: prob || { subject: '刑法', source_exam: '令和4年刑法第1問小問2改題' } }),
      });
      const data = await res.json();
      if (data.success && data.analysis && data.analysis.dissected_segments) {
        setAnatomy(data.analysis);
        setSelectedSegment(data.analysis.dissected_segments[0]);
      }
    } catch (err) {
      console.warn('アナトミーAPI通信例外。デフォルトモデルを表示:', err);
    } finally {
      setLoadingAnatomy(false);
    }
  };

  useEffect(() => {
    async function initData() {
      setLoading(true);
      try {
        const { data: subData, error: subErr } = await supabase
          .from('submissions')
          .select('*, sub_problems(*)')
          .eq('id', submissionId)
          .single();

        if (subErr || !subData) {
          alert('答案データが見つかりませんでした');
          router.push('/dashboard');
          return;
        }

        setSubmission(subData);
        const prob = subData.sub_problems;
        setProblem(prob);

        if (subData.comparison_feedback) {
          setComparisonFeedback(subData.comparison_feedback);
        }

        // 親答案があれば取得
        if (subData.parent_submission_id) {
          const { data: parentData } = await supabase
            .from('submissions')
            .select('*')
            .eq('id', subData.parent_submission_id)
            .maybeSingle();
          if (parentData) {
            setParentSubmission(parentData);
          }
        }

        if (subData.ai_feedback) {
          setViewMode('review');
        } else {
          setViewMode('anatomy');
        }

        await loadOrGenerateAnatomy(prob);
      } catch (err: any) {
        console.error('初期データ取得例外:', err);
      } finally {
        setLoading(false);
      }
    }
    initData();
  }, [submissionId, router]);

  // 前後比較の生成
  const handleGenerateComparison = async () => {
    if (!parentSubmission || !submission || loadingComparison) return;
    setLoadingComparison(true);
    try {
      const res = await fetch('/api/compare-drafts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          submissionId: submission.id,
          problem: problem || { subject: '刑法', source_exam: '令和4年刑法第1問小問2改題' },
          originalDraft: parentSubmission.user_draft,
          revisedDraft: submission.user_draft,
        }),
      });
      const data = await res.json();
      if (data.success && data.comparisonFeedback) {
        setComparisonFeedback(data.comparisonFeedback);
      } else {
        alert('比較分析の生成に失敗しました');
      }
    } catch (err: any) {
      alert(`比較分析エラー: ${err.message}`);
    } finally {
      setLoadingComparison(false);
    }
  };

  // 答案削除
  const handleDelete = async () => {
    if (!confirm('この起案履歴を削除してもよろしいですか？（この操作は取り消せません）')) return;
    setDeleting(true);
    try {
      const { error } = await supabase
        .from('submissions')
        .delete()
        .eq('id', submissionId);

      if (error) throw error;
      alert('起案履歴を削除しました。');
      router.push('/dashboard');
    } catch (err: any) {
      alert(`削除に失敗しました: ${err.message}`);
      setDeleting(false);
    }
  };

  // 🌟 再起案ハンドラ（問題ID retry_problem_id も確実に引き継ぐ）
  const handleRetry = () => {
    sessionStorage.setItem('retry_draft', submission.user_draft || '');
    sessionStorage.setItem('parent_submission_id', submission.id);
    const targetProbId = submission.problem_id || problem?.id;
    if (targetProbId) {
      sessionStorage.setItem('retry_problem_id', targetProbId);
    }
    router.push('/practice');
  };

  // 解剖タグスタイル
  const getTagStyle = (type: string, isSelected: boolean) => {
    const base = 'transition-all cursor-pointer rounded-md p-2.5 my-2 block font-serif border shadow-xs ';
    const ring = isSelected ? 'ring-3 ring-slate-900 font-bold shadow-md ' : 'hover:opacity-90 hover:shadow-2xs ';

    switch (type) {
      case 'requirement':
        return base + ring + 'bg-blue-100 text-blue-950 border-blue-400 font-bold';
      case 'purpose':
        return base + ring + 'bg-emerald-100 text-emerald-950 border-emerald-400 font-bold';
      case 'norm':
        return base + ring + 'bg-amber-100 text-amber-950 border-amber-400 font-extrabold';
      case 'application':
        return base + ring + 'bg-rose-100 text-rose-950 border-rose-400 font-bold';
      default:
        return base + ring + 'bg-slate-200 text-slate-900 border-slate-400 font-bold';
    }
  };

  const formatSource = (source: string | undefined) => {
    if (!source) return '（令和4年刑法第1問小問2改題）';
    return source.startsWith('（') && source.endsWith('）') ? source : `（${source}）`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#cbd5e1] flex items-center justify-center text-slate-900 font-sans">
        <div className="flex items-center gap-3 text-sm font-bold font-mono">
          <div className="w-6 h-6 border-3 border-cyan-600 border-t-transparent rounded-full animate-spin" />
          <span>履歴・添削講評データを読み込み中...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#cbd5e1] text-slate-900 flex flex-col font-sans">
      
      {/* ヘッダーバー */}
      <header className="sticky top-0 z-30 bg-white text-slate-900 border-b-2 border-cyan-600 px-6 py-2.5 flex flex-wrap items-center justify-between gap-3 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/dashboard"
            className="text-xs bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded text-slate-900 font-black border border-slate-300 transition cursor-pointer"
          >
            ← 履歴一覧
          </Link>
          <span className="font-extrabold text-sm text-slate-900">
            {problem?.subject || '刑法'} <span className="text-cyan-800 font-bold">{formatSource(problem?.source_exam)}</span>
          </span>

          {/* ビュー切り替えタブ */}
          <div className="flex items-center bg-slate-200 rounded-lg p-1 border border-slate-300 gap-1.5 text-xs">
            <button
              onClick={() => setViewMode('review')}
              className={`px-3.5 py-1.5 rounded-md font-black transition cursor-pointer ${
                viewMode === 'review'
                  ? 'bg-indigo-700 text-white shadow-md'
                  : 'text-slate-700 hover:text-slate-950'
              }`}
            >
              ⚖️ 1. AI採点・添削講評（履歴）
            </button>
            <button
              onClick={() => {
                setViewMode('anatomy');
                if (!anatomy) loadOrGenerateAnatomy(problem);
              }}
              className={`px-3.5 py-1.5 rounded-md font-black transition cursor-pointer ${
                viewMode === 'anatomy'
                  ? 'bg-purple-700 text-white shadow-md'
                  : 'text-slate-700 hover:text-slate-950'
              }`}
            >
              🔬 2. 合格答案アナトミー（4色解剖）
            </button>
            {parentSubmission && (
              <button
                onClick={() => setViewMode('compare')}
                className={`px-3.5 py-1.5 rounded-md font-black transition cursor-pointer ${
                  viewMode === 'compare'
                    ? 'bg-cyan-700 text-white shadow-md'
                    : 'text-slate-700 hover:text-slate-950'
                }`}
              >
                ⚖ 3. 初稿 vs 改訂稿（前後対比）
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* 文字サイズ変更バー */}
          <div className="flex items-center gap-1 bg-slate-100 px-2.5 py-1 rounded border border-slate-300 text-xs">
            <span className="text-slate-700 font-black text-xs mr-1">文字:</span>
            {[
              { lvl: 1, label: '小' },
              { lvl: 2, label: '中' },
              { lvl: 3, label: '大' },
              { lvl: 4, label: '特大' },
            ].map((btn) => (
              <button
                key={btn.lvl}
                onClick={() => setFontSizeLevel(btn.lvl as any)}
                className={`px-2 py-0.5 rounded font-black transition cursor-pointer ${
                  fontSizeLevel === btn.lvl
                    ? 'bg-cyan-700 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {btn.label}
              </button>
            ))}
          </div>

          <button
            onClick={handleRetry}
            className="px-3.5 py-1.5 bg-cyan-700 hover:bg-cyan-800 text-white text-xs font-black rounded-md shadow-xs flex items-center gap-1.5 transition cursor-pointer"
          >
            <span>✍</span>
            <span>この答案をもとに再起案</span>
          </button>

          <button
            onClick={handleDelete}
            disabled={deleting}
            className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 disabled:bg-slate-400 text-white text-xs font-black rounded-md shadow-xs transition flex items-center gap-1 cursor-pointer"
          >
            <span>🗑️</span>
            <span>{deleting ? '削除中...' : 'この答案を削除'}</span>
          </button>
        </div>
      </header>

      {/* メインエリア */}
      <main className="flex-1 p-4 max-w-[1800px] w-full mx-auto flex flex-col gap-6">
        
        {/* モード1: AI採点・添削講評（履歴） */}
        {viewMode === 'review' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            <section className="lg:col-span-5 bg-white rounded-lg border-2 border-slate-300 shadow-md flex flex-col">
              <div className="bg-slate-800 text-white px-4 py-3 rounded-t-lg flex items-center justify-between text-xs font-bold">
                <span>📝 あなたが起案した答案（{submission?.user_draft?.length || 0}字）</span>
                <span className="text-cyan-300 font-mono">
                  {submission?.created_at ? new Date(submission.created_at).toLocaleString('ja-JP') : ''}
                </span>
              </div>
              <div className="p-5 bg-slate-50/50 select-text rounded-b-lg">
                <div style={fontSizeStyle} className="font-serif text-slate-900 whitespace-pre-wrap break-words">
                  {submission?.user_draft}
                </div>
              </div>
            </section>

            <section className="lg:col-span-7 bg-white rounded-lg border-2 border-indigo-400 shadow-md flex flex-col">
              <div className="bg-indigo-900 text-white px-5 py-3 rounded-t-lg flex items-center justify-between text-xs font-bold">
                <span className="flex items-center gap-2">
                  <span className="w-2.5 h-4 bg-cyan-400 rounded-xs" />
                  <span className="text-xs font-black tracking-wider">
                    【AI採点・添削講評】三段論法・規範定立・事実評価の検証結果
                  </span>
                </span>
                <span className="text-indigo-200 text-[11px] font-mono">
                  所要時間: {submission?.time_spent_seconds ? `${Math.floor(submission.time_spent_seconds / 60)}分` : '記録なし'}
                </span>
              </div>

              <div className="p-6 bg-[#f8fafc] select-text rounded-b-lg space-y-4">
                {submission?.ai_feedback ? (
                  <div style={fontSizeStyle} className="font-serif text-slate-900 whitespace-pre-wrap leading-relaxed max-w-4xl break-words">
                    {submission.ai_feedback}
                  </div>
                ) : (
                  <div className="p-10 text-center text-slate-600 font-bold space-y-2">
                    <p>この提出履歴にはAI添削講評が記録されていません。</p>
                    <p className="text-xs text-slate-500">
                      画面上部の「✍ この答案をもとに再起案」から再度提出すると、詳細な添削講評が生成・保存されます。
                    </p>
                  </div>
                )}
              </div>
            </section>
          </div>
        )}

        {/* モード2: 合格答案解剖対比（4色解剖） */}
        {viewMode === 'anatomy' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            <section className="lg:col-span-5 bg-white rounded-lg border-2 border-slate-300 shadow-md flex flex-col">
              <div className="bg-slate-800 text-white px-4 py-3 rounded-t-lg flex items-center justify-between text-xs font-bold">
                <span>📝 あなたが起案した答案（{submission?.user_draft?.length || 0}字）</span>
                <span className="text-cyan-300 font-mono">
                  {submission?.created_at ? new Date(submission.created_at).toLocaleString('ja-JP') : ''}
                </span>
              </div>
              <div className="p-5 bg-slate-50/50 select-text rounded-b-lg">
                <div style={fontSizeStyle} className="font-serif text-slate-900 whitespace-pre-wrap break-words">
                  {submission?.user_draft}
                </div>
              </div>
            </section>

            <section className="lg:col-span-7 bg-white rounded-lg border-2 border-slate-300 shadow-md flex flex-col">
              <div className="bg-purple-900 text-white px-5 py-3 rounded-t-lg flex flex-wrap items-center justify-between gap-2 text-xs font-bold">
                <span className="flex items-center gap-2">
                  <span>🔬</span>
                  <span>合格答案の構造解剖（4色識別）</span>
                </span>
                <button
                  onClick={() => loadOrGenerateAnatomy(problem)}
                  className="px-2.5 py-0.5 bg-purple-800 hover:bg-purple-700 text-white text-[11px] font-bold rounded border border-purple-500 cursor-pointer"
                >
                  🔄 再読み込み
                </button>
              </div>

              <div className="p-5 space-y-5">
                <div className="bg-slate-100 p-3.5 rounded-lg border-2 border-slate-300 flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-black text-slate-900">【4大構造の色分け識別】</span>
                  <div className="flex flex-wrap items-center gap-2 text-xs font-black">
                    <span className="px-2.5 py-1 rounded bg-blue-100 text-blue-950 border border-blue-400">① 条文要件（青）</span>
                    <span className="px-2.5 py-1 rounded bg-emerald-100 text-emerald-950 border border-emerald-400">② 保護法益・趣旨（緑）</span>
                    <span className="px-2.5 py-1 rounded bg-amber-100 text-amber-950 border border-amber-400">③ 規範定立（黄）</span>
                    <span className="px-2.5 py-1 rounded bg-rose-100 text-rose-950 border border-rose-400">④ 事実摘示と評価（赤）</span>
                  </div>
                </div>

                {anatomy?.pass_reason_summary && (
                  <div className="bg-purple-50 border-2 border-purple-200 p-4 rounded-lg shadow-2xs space-y-1">
                    <strong className="block text-xs font-black text-purple-900">【この答案が上位合格する所以（配点の急所）】</strong>
                    <p style={fontSizeStyle} className="text-purple-950 font-sans font-bold break-words">
                      {anatomy.pass_reason_summary}
                    </p>
                  </div>
                )}

                <div className="p-5 bg-white rounded-lg border-2 border-slate-300 shadow-xs select-text">
                  <div>
                    {anatomy?.dissected_segments?.map((seg: any, idx: number) => {
                      const isSelected = selectedSegment === seg;
                      return (
                        <div
                          key={idx}
                          onClick={() => setSelectedSegment(seg)}
                          className={getTagStyle(seg.type, isSelected)}
                          title="クリックして解説を表示"
                        >
                          <div style={fontSizeStyle} className="break-words">
                            {seg.text}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {selectedSegment && (
                  <div className="bg-slate-50 border-2 border-slate-900 p-4 rounded-lg text-xs space-y-3 shadow-xs">
                    <div className="flex items-center justify-between border-b border-slate-300 pb-2">
                      <span className="font-black text-slate-900 text-xs">選択部分の解剖解説</span>
                      <span className="text-[11px] font-bold text-slate-600">あなたの答案の該当部分と比較してみましょう</span>
                    </div>
                    <div style={fontSizeStyle} className="bg-white p-3.5 rounded border border-slate-300 font-serif text-slate-900 font-bold break-words">
                      "{selectedSegment.text}"
                    </div>
                    <div className="space-y-1 pt-1">
                      <span className="font-black text-purple-900 block text-xs">【なぜこの記述が必要なのか（思考手順）】</span>
                      <p style={fontSizeStyle} className="text-slate-800 font-sans font-bold break-words">
                        {selectedSegment.annotation}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </section>
          </div>
        )}

        {/* モード3: 前後対比（初稿 vs 改訂稿） */}
        {viewMode === 'compare' && parentSubmission && (
          <div className="flex flex-col gap-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
              <section className="bg-white rounded-lg border-2 border-slate-300 shadow-md flex flex-col">
                <div className="bg-slate-700 text-white px-4 py-3 rounded-t-lg flex items-center justify-between text-xs font-bold">
                  <span>◀ 初稿（改善前・{parentSubmission.user_draft?.length || 0}字）</span>
                  <span className="text-slate-300 font-mono text-[11px]">{new Date(parentSubmission.created_at).toLocaleString('ja-JP')}</span>
                </div>
                <div className="p-5 bg-slate-50/50 select-text rounded-b-lg">
                  <div style={fontSizeStyle} className="font-serif text-slate-900 whitespace-pre-wrap break-words">
                    {parentSubmission.user_draft}
                  </div>
                </div>
              </section>

              <section className="bg-white rounded-lg border-2 border-cyan-500 shadow-md flex flex-col">
                <div className="bg-cyan-800 text-white px-4 py-3 rounded-t-lg flex items-center justify-between text-xs font-bold">
                  <span>▶ 改訂稿（再起案後・{submission?.user_draft?.length || 0}字）</span>
                  <span className="text-cyan-200 font-mono text-[11px]">{new Date(submission?.created_at).toLocaleString('ja-JP')}</span>
                </div>
                <div className="p-5 bg-cyan-50/20 select-text rounded-b-lg">
                  <div style={fontSizeStyle} className="font-serif text-slate-900 whitespace-pre-wrap break-words">
                    {submission?.user_draft}
                  </div>
                </div>
              </section>
            </div>

            <section className="bg-white rounded-lg border-2 border-slate-300 shadow-md flex flex-col">
              <div className="bg-slate-900 text-white px-5 py-3 rounded-t-lg flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-4 bg-emerald-400 rounded-xs" />
                  <h3 className="text-xs font-black tracking-wider">
                    【新旧答案の比較分析：改善点・克服できた弱点・今後の課題】
                  </h3>
                  {comparisonFeedback && (
                    <span className="bg-emerald-700 text-white text-[10px] font-bold px-2 py-0.5 rounded ml-2">
                      ✓ 履歴保存済
                    </span>
                  )}
                </div>

                <button
                  onClick={handleGenerateComparison}
                  disabled={loadingComparison}
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-600 text-white text-xs font-black rounded shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                >
                  {loadingComparison ? 'AIが比較分析中...' : comparisonFeedback ? '🔄 比較分析を再実行' : '🔍 改善点・課題のAI比較分析を実行'}
                </button>
              </div>

              <div className="p-6 bg-slate-50/40 select-text rounded-b-lg">
                {loadingComparison ? (
                  <div className="p-10 flex flex-col items-center justify-center gap-3 text-slate-700 font-mono">
                    <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin" />
                    <span className="text-xs font-bold">初稿と改訂稿を照合し、改善度を検証中...</span>
                  </div>
                ) : comparisonFeedback ? (
                  <div style={fontSizeStyle} className="font-serif text-slate-900 whitespace-pre-wrap leading-relaxed max-w-5xl mx-auto break-words">
                    {comparisonFeedback}
                  </div>
                ) : (
                  <div className="p-10 text-center space-y-3">
                    <p className="text-sm font-bold text-slate-700">初稿と改訂稿の比較評価が未生成です。</p>
                    <button
                      onClick={handleGenerateComparison}
                      className="px-6 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-black text-xs rounded-lg shadow-md cursor-pointer"
                    >
                      改善点・今後の課題のAI比較分析を実行する ➔
                    </button>
                  </div>
                )}
              </div>
            </section>
          </div>
        )}
      </main>
    </div>
  );
}