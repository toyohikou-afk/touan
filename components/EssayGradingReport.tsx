'use client';

import React, { useState } from 'react';
import { GradeResult } from '../types/grading';

interface EssayGradingReportProps {
  userAnswer: string;
  result: GradeResult;
}

export const EssayGradingReport: React.FC<EssayGradingReportProps> = ({
  userAnswer,
  result,
}) => {
  const gradeStyles = {
    A: 'bg-emerald-600 text-white border-emerald-700',
    B: 'bg-blue-600 text-white border-blue-700',
    C: 'bg-amber-500 text-white border-amber-600',
    D: 'bg-orange-500 text-white border-orange-600',
    E: 'bg-rose-600 text-white border-rose-700',
    F: 'bg-red-800 text-white border-red-900',
  }[result.grade] || 'bg-slate-700 text-white border-slate-800';

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6 p-4 md:p-6 bg-slate-50 min-h-screen text-slate-800">
      {/* 地雷検知バナー */}
      {result.isFatal && (
        <div className="bg-red-950 border-2 border-red-600 rounded-xl p-5 shadow-lg text-white">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-red-600 rounded-lg shrink-0">
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div className="space-y-3 flex-1">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded text-xs font-bold uppercase tracking-wider bg-red-600 text-white">
                  FATAL TRAP TRIGGERED
                </span>
                <h3 className="text-lg font-bold tracking-tight text-red-200">
                  即死判定（地雷トラップを作動させました）
                </h3>
              </div>
              <p className="text-sm text-red-200/90 leading-relaxed">
                考査委員が即座に採点を打ち切る致命的欠陥が検出されました。本問の配点基準を満たしておらず、形式的基準により点数が下限に固定されています。
              </p>

              <div className="space-y-2 mt-3">
                {result.triggeredTraps.map((trap, idx) => (
                  <div key={idx} className="bg-red-900/60 border border-red-700/60 rounded-lg p-3.5 space-y-2 text-sm">
                    <div className="font-semibold text-red-100 flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                      {trap.trapName}
                    </div>
                    {trap.detectedText && (
                      <div className="bg-black/40 rounded p-2 text-xs font-mono text-red-200 border border-red-900">
                        <span className="text-red-400 font-bold block mb-0.5">問題箇所（抜粋）:</span>
                        "{trap.detectedText}"
                      </div>
                    )}
                    <p className="text-xs text-red-200/80 leading-relaxed">
                      <span className="font-semibold text-red-300">理由:</span> {trap.whyFatal}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* スコア・判定カード */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex items-center justify-between md:col-span-1">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Result</div>
            <div className="text-3xl font-black mt-1 text-slate-900">{result.score} <span className="text-sm font-semibold text-slate-400">/ 100</span></div>
          </div>
          <div className={`w-16 h-16 rounded-xl flex items-center justify-center font-black text-3xl shadow-inner border-2 ${gradeStyles}`}>
            {result.grade}
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm md:col-span-3 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-1">
            <span className="text-xs font-medium text-slate-400 block">検討順序（主犯→共犯）</span>
            <div className="flex items-center gap-2 mt-1">
              {result.structuralCheck.orderOfParties ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  適正（原則通り）
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                  逆転（主犯後回し）
                </span>
              )}
            </div>
          </div>

          <div className="space-y-1">
            <span className="text-xs font-medium text-slate-400 block">法的三段論法</span>
            <div className="flex items-center gap-2 mt-1">
              <span className={`px-2.5 py-1 rounded-md text-xs font-semibold border ${
                result.structuralCheck.syllogismStrictness === 'High'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : result.structuralCheck.syllogismStrictness === 'Medium'
                  ? 'bg-amber-50 text-amber-700 border-amber-200'
                  : 'bg-rose-50 text-rose-700 border-rose-200'
              }`}>
                {result.structuralCheck.syllogismStrictness === 'High' ? '厳格（規範先行）' : result.structuralCheck.syllogismStrictness === 'Medium' ? '標準' : '崩壊（作文型）'}
              </span>
            </div>
          </div>

          <div className="space-y-1">
            <span className="text-xs font-medium text-slate-400 block">事実の法的名札（評価）</span>
            <div className="flex items-center gap-2 mt-1">
              <span className={`px-2.5 py-1 rounded-md text-xs font-semibold border ${
                result.structuralCheck.factEvaluationScore === 'Sufficient'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-rose-50 text-rose-700 border-rose-200'
              }`}>
                {result.structuralCheck.factEvaluationScore === 'Sufficient' ? '法的名札あり' : '事実の引き写しのみ'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 講評 */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-2">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">考査委員の直截講評</h4>
        <p className="text-sm leading-relaxed text-slate-700 font-medium">
          {result.criticalFeedback}
        </p>
      </div>

      {/* 左右比較 */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="border-b border-slate-200 bg-slate-100/70 px-6 py-3.5 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-800 tracking-wide">
            答案構造の左右比較（あなたの答案 vs 合格骨格）
          </h3>
          <span className="text-xs text-slate-500 font-mono hidden sm:inline">
            ※規範定立と事実の評価（名札）の位置に着目してください
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-slate-200">
          <div className="p-5 sm:p-6 space-y-3 bg-slate-50/50">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">あなたの提出答案</span>
              <span className="text-xs text-slate-400 font-mono">{userAnswer.length} 文字</span>
            </div>
            <div className="p-4 bg-white border border-slate-200 rounded-lg text-sm font-mono leading-relaxed text-slate-800 whitespace-pre-wrap max-h-[580px] overflow-y-auto">
              {userAnswer}
            </div>
          </div>

          <div className="p-5 sm:p-6 space-y-3 bg-emerald-50/20">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">合格ライン骨格答案（模範三段論法）</span>
              <span className="text-xs px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-semibold text-[11px]">A評価基準</span>
            </div>
            <div className="p-4 bg-white border border-emerald-200/80 rounded-lg text-sm font-mono leading-relaxed text-slate-800 whitespace-pre-wrap max-h-[580px] overflow-y-auto shadow-sm">
              {result.idealStructure}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};