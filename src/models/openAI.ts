import { generateText, generateObject, CoreMessage } from 'ai';
import { createOpenAI, OpenAIProvider } from '@ai-sdk/openai';
import { z } from 'zod';

import { ExtractionResult, OcrResult, Usage, JsonSchema } from '../types';
import { generateZodSchema } from '../utils';

import { BaseModel } from './base';
import {
  OCR_SYSTEM_PROMPT,
  TEXT_EXTRACTION_SYSTEM_PROMPT,
  IMAGE_EXTRACTION_SYSTEM_PROMPT,
} from './shared';

export class OpenAIModel extends BaseModel {
  private provider: OpenAIProvider;
  private model: string;

  constructor(model: string) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('Missing OPENAI_API_KEY in .env');
    }

    super();

    this.provider = createOpenAI({ apiKey: process.env.OPENAI_API_KEY });
    this.model = model;
  }

  async ocr(imagePath: string): Promise<OcrResult> {
    const messages: CoreMessage[] = [
      { role: 'system', content: OCR_SYSTEM_PROMPT },
      {
        role: 'user',
        content: [
          {
            type: 'image',
            image: imagePath,
          },
        ],
      },
    ];

    const { text, usage: ocrUsage } = await generateText({
      model: this.provider(this.model),
      messages,
    });

    const usage: Usage = {
      duration: 0,
      promptTokens: ocrUsage.promptTokens,
      completionTokens: ocrUsage.completionTokens,
      totalTokens: ocrUsage.totalTokens,
    };

    return {
      text,
      usage,
    };
  }

  async extract(text: string, schema: JsonSchema): Promise<ExtractionResult> {
    const messages: CoreMessage[] = [
      { role: 'system', content: TEXT_EXTRACTION_SYSTEM_PROMPT },
      { role: 'user', content: text },
    ];

    const zodSchema = generateZodSchema(schema);

    const { object, usage: extractionUsage } = await generateObject({
      model: this.provider(this.model),
      messages,
      schema: zodSchema,
    });

    const usage: Usage = {
      duration: 0,
      promptTokens: extractionUsage.promptTokens,
      completionTokens: extractionUsage.completionTokens,
      totalTokens: extractionUsage.totalTokens,
    };

    return {
      json: object,
      usage,
    };
  }

  async ocrAndExtract(
    imagePath: string,
    schema: JsonSchema,
  ): Promise<{ json: Record<string, any>; text?: string; usage: Usage }> {
    const messages: CoreMessage[] = [
      { role: 'system', content: IMAGE_EXTRACTION_SYSTEM_PROMPT },
      {
        role: 'user',
        content: [
          {
            type: 'image',
            image: imagePath,
          },
        ],
      },
    ];

    const zodSchema = generateZodSchema(schema);

    const { object, usage: extractionUsage } = await generateObject({
      model: this.provider(this.model),
      messages,
      schema: zodSchema,
    });

    const usage: Usage = {
      duration: 0,
      promptTokens: extractionUsage.promptTokens,
      completionTokens: extractionUsage.completionTokens,
      totalTokens: extractionUsage.totalTokens,
    };

    return {
      json: object,
      usage,
    };
  }
}
