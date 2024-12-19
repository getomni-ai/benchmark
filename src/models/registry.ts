import { extractWithAI } from './ai';
import { extractWithOmniAI } from './omniAI';
import { extractWithZerox } from './zerox';

export const OPENAI_MODELS = ['gpt-4o-mini', 'gpt-4o'];
export const ANTHROPIC_MODELS = ['claude-3-5-sonnet-20241022'];

export const MODEL_PROVIDERS = {
  openai: {
    models: OPENAI_MODELS,
    provider: extractWithAI,
  },
  omniai: {
    models: ['omniai'],
    provider: extractWithOmniAI,
  },
  zerox: {
    models: ['zerox'],
    provider: extractWithZerox,
  },
  anthropic: {
    models: ANTHROPIC_MODELS,
    provider: extractWithAI,
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
