import { FINETUNED_MODELS } from '../..';

// token cost in USD per 1M tokens
export const TOKEN_COST = {
  'claude-3-5-sonnet-20241022': {
    input: 3,
    output: 15,
  },
  'gemini-2.0-flash-exp': {
    input: 0, // TODO: check this, currently not available
    output: 0, // TODO: check this, currently not available
  },
  'gemini-1.5-pro': {
    input: 1.25,
    output: 5,
  },
  'gemini-1.5-flash': {
    input: 0.075,
    output: 0.3,
  },
  'gpt-4o': {
    input: 2.5,
    output: 10,
  },
  'gpt-4o-mini': {
    input: 0.15,
    output: 0.6,
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
) => {
  // Add default OpenAI Finetune cost
  const fineTuneCost = FINETUNED_MODELS.map((el) => {
    return { [el]: { input: 3.75, output: 15.0 } };
  });
  const combinedCost = { ...TOKEN_COST, ...fineTuneCost };
  const modelInfo = combinedCost[model];

  if (!modelInfo) {
    throw new Error(`Model '${model}' not found`);
  }

  return (modelInfo[type] * tokens) / 1000000;
};
