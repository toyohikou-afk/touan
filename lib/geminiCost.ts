import type { GenerateContentResponseUsageMetadata } from '@google/genai';

export type GeminiUsageMetadata = GenerateContentResponseUsageMetadata;

export interface GeminiCostBreakdown {
  promptTokens: number;
  candidatesTokens: number;
  thoughtsTokens: number;
  totalTokens: number;
  estimatedCostUsd: number;
  estimatedCostJpy: number;
}

export function calculateGeminiCost(
  usageMetadata?: GeminiUsageMetadata,
  usdToJpyRate = 155
): GeminiCostBreakdown {
  if (!usageMetadata) {
    return {
      promptTokens: 0,
      candidatesTokens: 0,
      thoughtsTokens: 0,
      totalTokens: 0,
      estimatedCostUsd: 0,
      estimatedCostJpy: 0,
    };
  }

  const promptTokens = usageMetadata.promptTokenCount ?? 0;
  const candidatesTokens = usageMetadata.candidatesTokenCount ?? 0;
  const thoughtsTokens = usageMetadata.thoughtsTokenCount ?? 0;
  const totalTokens =
    usageMetadata.totalTokenCount ?? promptTokens + candidatesTokens + thoughtsTokens;

  const inputCostUsd = (promptTokens / 1_000_000) * 1.25;
  const outputCostUsd = ((candidatesTokens + thoughtsTokens) / 1_000_000) * 10.0;

  const estimatedCostUsd = Number((inputCostUsd + outputCostUsd).toFixed(6));
  const estimatedCostJpy = Number((estimatedCostUsd * usdToJpyRate).toFixed(2));

  return {
    promptTokens,
    candidatesTokens,
    thoughtsTokens,
    totalTokens,
    estimatedCostUsd,
    estimatedCostJpy,
  };
}
