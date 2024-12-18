import { OmniAI } from './omniAI';
import { OpenAIModel } from './openAI';

export const MODEL_PROVIDERS = {
  openai: {
    models: ['gpt-4o-mini', 'gpt-4o', 'o1-mini', 'o1'],
    provider: OpenAIModel,
  },
  omniai: {
    models: ['omniai'],
    provider: OmniAI,
  },
};

export const createModelInstance = (model: string) => {
  const foundProvider = Object.values(MODEL_PROVIDERS).find((group) =>
    group.models.includes(model),
  );
  if (foundProvider) {
    return new foundProvider.provider(model);
  }
  throw new Error(`Model '${model}' does not support image inputs`);
};
