import { extractOmniAI } from './omniAI';
import { extractOpenAI } from './openAI';

export const MODEL_PROVIDERS = {
  openai: {
    models: ['gpt-4o-mini', 'gpt-4o', 'o1-mini', 'o1'],
    provider: extractOpenAI,
  },
  omniai: {
    models: ['omniai'],
    provider: extractOmniAI,
  },
};

export const getModelProvider = (model: string) => {
  const foundProvider = Object.values(MODEL_PROVIDERS).find((group) =>
    group.models.includes(model),
  );

  if (foundProvider) {
    return foundProvider.provider;
  }

  throw new Error(`Model '${model}' does not support image inputs`);
};
