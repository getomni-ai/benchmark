import { AzureDocumentIntelligenceProvider } from './azure';
import { AWSTextractProvider } from './awsTextract';
import { GeminiProvider } from './gemini';
import { GoogleDocumentAIProvider } from './googleDocumentAI';
import { LLMProvider } from './llm';
import { MistralProvider } from './mistral';
import { OmniAIProvider } from './omniAI';
import { UnstructuredProvider } from './unstructured';
import { ZeroxProvider } from './zerox';

export const OPENAI_MODELS = ['gpt-4o-mini', 'gpt-4o', 'o1', 'o1-mini', 'o3-mini'];
export const AZURE_OPENAI_MODELS = [
  'azure-gpt-4o-mini',
  'azure-gpt-4o',
  'azure-o1',
  'azure-o1-mini',
];
export const ANTHROPIC_MODELS = [
  'claude-3-5-sonnet-20241022',
  'claude-3-7-sonnet-20250219',
];
export const DEEPSEEK_MODELS = ['deepseek-chat'];
export const GOOGLE_GENERATIVE_AI_MODELS = [
  'gemini-2.0-flash-001',
  'gemini-1.5-pro',
  'gemini-1.5-flash',
];
export const FINETUNED_MODELS = [
  'ft:gpt-4o-2024-08-06:omniai::Arxk5CGQ', // 1040 - 25
  'ft:gpt-4o-2024-08-06:omniai::ArxtsMva', // 1040 - 50
  'ft:gpt-4o-2024-08-06:omniai::ArxvfLvw', // 1040 - 100
  'ft:gpt-4o-2024-08-06:omniai::AryLM0UQ', // 1040 - 250
  'ft:gpt-4o-2024-08-06:omniai::Arz2HbeO', // 1040 - 500
  'ft:gpt-4o-2024-08-06:omniai::Arzh2QBC', // 1040 - 1000
  'ft:gpt-4o-2024-08-06:omniai::AtOXM6UJ', // Full Dataset - 250
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
  azureOpenai: {
    models: AZURE_OPENAI_MODELS,
    provider: LLMProvider,
  },
  gemini: {
    models: GOOGLE_GENERATIVE_AI_MODELS,
    provider: GeminiProvider,
  },
  google: {
    models: ['google-document-ai'],
    provider: GoogleDocumentAIProvider,
  },
  deepseek: {
    models: DEEPSEEK_MODELS,
    provider: LLMProvider,
  },
  azure: {
    models: ['azure-document-intelligence'],
    provider: AzureDocumentIntelligenceProvider,
  },
  mistral: {
    models: ['mistral-ocr'],
    provider: MistralProvider,
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
