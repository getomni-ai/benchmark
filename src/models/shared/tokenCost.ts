// token cost in USD per 1M tokens
export const TOKEN_COST = {
  omniai: {
    input: 2.5,
    output: 10,
  },
  'gpt-4o': {
    input: 2.5,
    output: 10,
  },
  'gpt-4o-mini': {
    input: 0.15,
    output: 0.6,
  },
  'claude-3-5-sonnet-20241022': {
    input: 3,
    output: 15,
  },
};

export const calculateTokenCost = (
  model: string,
  type: 'input' | 'output',
  tokens: number,
) => {
  const modelInfo = TOKEN_COST[model];

  if (!modelInfo) {
    throw new Error(`Model '${model}' not found`);
  }

  return (modelInfo[type] * tokens) / 1000000;
};
