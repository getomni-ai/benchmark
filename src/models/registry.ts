import { AzureDocumentIntelligenceProvider } from './azure';
import { AWSTextractProvider } from './awsTextract';
import { DashscopeProvider } from './dashscope';
import { GeminiProvider } from './gemini';
import { GoogleDocumentAIProvider } from './googleDocumentAI';
import { LLMProvider } from './llm';
import { MistralProvider } from './mistral';
import { OmniAIProvider } from './omniAI';
import { OpenAIProvider } from './openai';
import { OpenRouterProvider } from './openrouter';
import { TogetherProvider } from './togetherai';
import { UnstructuredProvider } from './unstructured';
import { ZeroxProvider } from './zerox';

export const OPENAI_MODELS = [
  'chatgpt-4o-latest',
  'gpt-4o-mini',
  'gpt-4o',
  'o1',
  'o1-mini',
  'o3-mini',
  'o4-mini',
  'gpt-4o-2024-11-20',
  'gpt-4.1',
  'gpt-4.1-mini',
  'gpt-4.1-nano',
  'gpt-5',
];
export const AZURE_OPENAI_MODELS = [
  'azure-gpt-4o-mini',
  'azure-gpt-4o',
  'azure-o1',
  'azure-o1-mini',
  'azure-o3-mini',
  'azure-gpt-4.1',
  'azure-gpt-4.1-mini',
  'azure-gpt-4.1-nano',
  'azure-gpt-5',
];
export const ANTHROPIC_MODELS = [
  'claude-3-5-sonnet-20241022',
  'claude-3-7-sonnet-20250219',
  'claude-sonnet-4-20250514',
  'claude-opus-4-20250514',
];
export const DEEPSEEK_MODELS = ['deepseek-chat'];
export const GOOGLE_GENERATIVE_AI_MODELS = [
  'gemini-1.5-pro',
  'gemini-1.5-flash',
  'gemini-2.0-flash-001',
  'gemini-2.0-flash',
  'gemini-2.5-pro-exp-03-25',
  'gemini-2.5-pro-preview-03-25',
  'gemini-2.5-flash-preview-05-20',
  'gemini-2.5-flash',
  'gemini-3-flash-preview',
  'gemini-3-pro-preview',
];
export const OPENROUTER_MODELS = [
  'qwen/qwen2.5-vl-32b-instruct:free',
  'qwen/qwen-2.5-vl-72b-instruct',
  // 'google/gemma-3-27b-it',
  'deepseek/deepseek-chat-v3-0324',
  'meta-llama/llama-3.2-11b-vision-instruct',
  'meta-llama/llama-3.2-90b-vision-instruct',
];
export const TOGETHER_MODELS = [
  'meta-llama/Llama-3.2-11B-Vision-Instruct-Turbo',
  'meta-llama/Llama-3.2-90B-Vision-Instruct-Turbo',
  'meta-llama/Llama-4-Scout-17B-16E-Instruct',
  'meta-llama/Llama-4-Maverick-17B-128E-Instruct-FP8',
];
export const FINETUNED_MODELS = [];

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
  openaiBase: {
    models: ['google/gemma-3-27b-it'],
    provider: OpenAIProvider,
  },
  openrouter: {
    models: OPENROUTER_MODELS,
    provider: OpenRouterProvider,
  },
  together: {
    models: TOGETHER_MODELS,
    provider: TogetherProvider,
  },
  dashscope: {
    models: ['qwen2.5-vl-32b-instruct', 'qwen2.5-vl-72b-instruct'],
    provider: DashscopeProvider,
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
