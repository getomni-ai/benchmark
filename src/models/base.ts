import { OcrResult, ExtractionResult, Usage } from '../types';

export abstract class BaseModel {
  protected apiKey: string;

  constructor() {}

  /**
   * Performs OCR on an image to extract text
   * @param imagePath Path or URL to the image
   * @param systemPrompt System prompt to guide the OCR
   */
  abstract ocr(imagePath: string): Promise<OcrResult>;

  /**
   * Extracts structured data from text according to a schema
   * @param text Input text to extract from
   * @param schema Zod schema defining the expected structure
   */
  abstract extract(text: string, schema: Record<string, any>): Promise<ExtractionResult>;

  /**
   * Performs OCR and extraction in a single operation
   * @param imagePath Path or URL to the image
   * @param schema Zod schema defining the expected structure
   */
  abstract ocrAndExtract(
    imagePath: string,
    schema: Record<string, any>,
  ): Promise<{
    json: Record<string, any>;
    text?: string;
    usage: Usage;
  }>;

  /**
   * Utility method to calculate token usage cost
   * @param usage Token usage information
   * @param costPerToken Cost per token in USD
   */
  protected calculateCost(usage: Usage, costPerToken: number): number {
    if (!usage.totalTokens) return 0;
    return Number((usage.totalTokens * costPerToken).toFixed(4));
  }
}
