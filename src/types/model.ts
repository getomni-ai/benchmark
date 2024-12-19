import { JsonSchema } from './data';

export interface ExtractParams {
  imagePath: string;
  directImageExtraction?: boolean;
  model?: string;
  schema?: JsonSchema;
  outputDir?: string;
}

export interface ExtractionResult {
  json?: Record<string, any>;
  text?: string;
  usage: Usage;
}

export interface Usage {
  duration?: number;
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  totalCost?: number;
}
