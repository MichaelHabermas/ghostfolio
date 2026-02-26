/**
 * Estimates USD cost from token usage.
 * Rates based on Claude 3.5 Sonnet via OpenRouter (approximate).
 */
const COST_PER_MILLION_INPUT = 3; // $3 / 1M input tokens
const COST_PER_MILLION_OUTPUT = 15; // $15 / 1M output tokens

export function estimateCostUsd(
  promptTokens: number,
  completionTokens: number
): number {
  const inputCost = (promptTokens / 1_000_000) * COST_PER_MILLION_INPUT;
  const outputCost =
    (completionTokens / 1_000_000) * COST_PER_MILLION_OUTPUT;
  return Math.round((inputCost + outputCost) * 1_000_000) / 1_000_000; // 6 decimal places
}
