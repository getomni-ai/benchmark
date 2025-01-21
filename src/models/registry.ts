import { AWSTextractProvider } from './awsTextract';
import { LLMProvider } from './llm';
import { OmniAIProvider } from './omniAI';
import { ZeroxProvider } from './zerox';
import { GoogleDocumentAIProvider } from './googleDocumentAI';
import { AzureDocumentIntelligenceProvider } from './azure';

export const OPENAI_MODELS = [
  'gpt-4o-mini',
  'gpt-4o',
  'ft:gpt-4o-2024-08-06:omniai::Arxk5CGQ', // 25
  'ft:gpt-4o-2024-08-06:omniai::ArxtYMva', // 50
  'ft:gpt-4o-2024-08-06:omniai::ArxvfLvw', // 100
  'ft:gpt-4o-2024-08-06:omniai::AryLM0UQ', // 250
  'ft:gpt-4o-2024-08-06:omniai::Arz2HbeO', // 500
  'ft:gpt-4o-2024-08-06:omniai::Arzh2QBC', // 1000
];
export const ANTHROPIC_MODELS = ['claude-3-5-sonnet-20241022'];
export const GOOGLE_GENERATIVE_AI_MODELS = [
  'gemini-2.0-flash-exp',
  'gemini-1.5-pro',
  'gemini-1.5-flash',
];

export const MODEL_PROVIDERS = {
  anthropic: {
    models: ANTHROPIC_MODELS,
    provider: LLMProvider,
  },
  aws: {
    models: ['aws-textract'],
    provider: AWSTextractProvider,
  },
  gemini: {
    models: GOOGLE_GENERATIVE_AI_MODELS,
    provider: LLMProvider,
  },
  google: {
    models: ['google-document-ai'],
    provider: GoogleDocumentAIProvider,
  },
  azure: {
    models: ['azure-document-intelligence'],
    provider: AzureDocumentIntelligenceProvider,
  },
  omniai: {
    models: ['omniai'],
    provider: OmniAIProvider,
  },
  openai: {
    models: OPENAI_MODELS,
    provider: LLMProvider,
  },
  zerox: {
    models: ['zerox'],
    provider: ZeroxProvider,
  },
};

export const getModelProvider = (model: string) => {
  const foundProvider = Object.values(MODEL_PROVIDERS).find((group) =>
    group.models.includes(model),
  );

  if (foundProvider) {
    const provider = new foundProvider.provider(model);
    return provider;
  }

  throw new Error(`Model '${model}' is not supported.`);
};
