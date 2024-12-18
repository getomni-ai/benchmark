export interface OcrResult {
  text: string;
  usage: Usage;
}

export interface ExtractionResult {
  json: Record<string, any>;
  usage: Usage;
}

export interface Usage {
  duration: number;
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
  totalCost?: number;
}

export interface ModelConfig {
  apiKey: string;
  modelId: string;
  options?: Record<string, any>;
}
