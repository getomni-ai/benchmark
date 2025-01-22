import { AWSTextractProvider } from './awsTextract';
import { LLMProvider } from './llm';
import { OmniAIProvider } from './omniAI';
import { ZeroxProvider } from './zerox';
import { GoogleDocumentAIProvider } from './googleDocumentAI';
import { AzureDocumentIntelligenceProvider } from './azure';
import { UnstructuredProvider } from './unstructured';

export const OPENAI_MODELS = ['gpt-4o-mini', 'gpt-4o'];
export const ANTHROPIC_MODELS = ['claude-3-5-sonnet-20241022'];
export const GOOGLE_GENERATIVE_AI_MODELS = [
  'gemini-2.0-flash-exp',
  'gemini-1.5-pro',
  'gemini-1.5-flash',
];
export const FINETUNED_MODELS = [
  'ft:gpt-4o-2024-08-06:omniai::Arxk5CGQ', // 1040 - 25
  'ft:gpt-4o-2024-08-06:omniai::ArxtYMva', // 1040 - 50
  'ft:gpt-4o-2024-08-06:omniai::ArxvfLvw', // 1040 - 100
  'ft:gpt-4o-2024-08-06:omniai::AryLM0UQ', // 1040 - 250
  'ft:gpt-4o-2024-08-06:omniai::Arz2HbeO', // 1040 - 500
  'ft:gpt-4o-2024-08-06:omniai::Arzh2QBC', // 1040 - 1000
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
  unstructured: {
    models: ['unstructured'],
    provider: UnstructuredProvider,
  },
  zerox: {
    models: ['zerox'],
    provider: ZeroxProvider,
  },
  groundTruth: {
    models: ['ground-truth'],
    provider: undefined,
  },
};

export const getModelProvider = (model: string) => {
  // Include Openai FT models
  MODEL_PROVIDERS['openaiFt'] = {
    models: FINETUNED_MODELS,
    provider: LLMProvider,
  };
  const foundProvider = Object.values(MODEL_PROVIDERS).find(
    (group) => group.models && group.models.includes(model),
  );

  if (foundProvider) {
    if (model === 'ground-truth') {
      return undefined;
    }
    const provider = new foundProvider.provider(model);
    return provider;
  }

  throw new Error(`Model '${model}' is not supported.`);
};
