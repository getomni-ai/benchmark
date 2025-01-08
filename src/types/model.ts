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
  inputCost?: number;
  outputCost?: number;
  totalCost?: number;
  ocr?: Usage;
  extraction?: Usage;
}
