import { FINETUNED_MODELS } from '../registry';

export const TOKEN_COST = {
  'azure-gpt-4o': {
    input: 2.5,
    output: 10,
  },
  'azure-gpt-4o-mini': {
    input: 0.15,
    output: 0.6,
  },
  'azure-o1': {
    input: 15,
    output: 60,
  },
  'azure-o1-mini': {
    input: 1.1,
    output: 4.4,
  },
  'claude-3-5-sonnet-20241022': {
    input: 3,
    output: 15,
  },
  'deepseek-chat': {
    input: 0.14,
    output: 0.28,
  },
  'gemini-1.5-pro': {
    input: 1.25,
    output: 5,
  },
  'gemini-1.5-flash': {
    input: 0.075,
    output: 0.3,
  },
  'gemini-2.0-flash-001': {
    input: 0.1,
    output: 0.4,
  },
  'gpt-4o': {
    input: 2.5,
    output: 10,
  },
  'gpt-4o-mini': {
    input: 0.15,
    output: 0.6,
  },
  o1: {
    input: 15,
    output: 60,
  },
  'o1-mini': {
    input: 1.1,
    output: 4.4,
  },
  'o3-mini': {
    input: 1.1,
    output: 4.4,
  },
  // Zerox uses GPT-4o
  zerox: {
    input: 2.5,
    output: 10,
  },
};

export const calculateTokenCost = (
  model: string,
  type: 'input' | 'output',
  tokens: number,
): number => {
  const fineTuneCost = Object.fromEntries(
    FINETUNED_MODELS.map((el) => [el, { input: 3.75, output: 15.0 }]),
  );
  const combinedCost = { ...TOKEN_COST, ...fineTuneCost };
  const modelInfo = combinedCost[model];
  if (!modelInfo) throw new Error(`Model '${model}' is not supported.`);
  return (modelInfo[type] * tokens) / 1_000_000;
};
