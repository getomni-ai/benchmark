import { generateText, generateObject, CoreMessage, CoreUserMessage } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createGoogleGenerativeAI } from '@ai-sdk/google';

import { ExtractionResult, JsonSchema } from '../types';
import { generateZodSchema, writeResultToFile } from '../utils';
import { calculateTokenCost } from './shared';
import { ModelProvider } from './base';
import {
  OCR_SYSTEM_PROMPT,
  JSON_EXTRACTION_SYSTEM_PROMPT,
  IMAGE_EXTRACTION_SYSTEM_PROMPT,
} from './shared';
import { OPENAI_MODELS, ANTHROPIC_MODELS, GOOGLE_GENERATIVE_AI_MODELS } from './registry';
import { FINETUNED_MODELS } from '../index';

export const createModelProvider = (model: string) => {
  if (OPENAI_MODELS.includes(model)) {
    return createOpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  if (FINETUNED_MODELS.includes(model)) {
    return createOpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  if (ANTHROPIC_MODELS.includes(model)) {
    return createAnthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  if (GOOGLE_GENERATIVE_AI_MODELS.includes(model)) {
    return createGoogleGenerativeAI({ apiKey: process.env.GEMINI_API_KEY });
  }
  throw new Error(`Model '${model}' does not support image inputs`);
};

export class LLMProvider extends ModelProvider {
  constructor(model: string) {
    super(model);
  }

  async ocr(imagePath: string) {
    const modelProvider = createModelProvider(this.model);

    let imageMessage: CoreUserMessage = {
      role: 'user',
      content: [
        {
          type: 'image',
          image: imagePath,
        },
      ],
    };

    if (ANTHROPIC_MODELS.includes(this.model)) {
      // read image and convert to base64
      const response = await fetch(imagePath);
      const imageBuffer = await response.arrayBuffer();
      const base64Image = Buffer.from(imageBuffer).toString('base64');
      imageMessage.content = [
        {
          type: 'image',
          image: base64Image,
        },
      ];
    }

    if (GOOGLE_GENERATIVE_AI_MODELS.includes(this.model)) {
      // gemini requires a text message in user messages
      imageMessage.content = [
        {
          type: 'text',
          text: ' ',
        },
        {
          type: 'file',
          data: imagePath,
          mimeType: 'image/png',
        },
      ];
    }

    const messages: CoreMessage[] = [
      { role: 'system', content: OCR_SYSTEM_PROMPT },
      imageMessage,
    ];

    const start = performance.now();
    const { text, usage: ocrUsage } = await generateText({
      model: modelProvider(this.model),
      messages,
    });
    const end = performance.now();

    const inputCost = calculateTokenCost(this.model, 'input', ocrUsage.promptTokens);
    const outputCost = calculateTokenCost(
      this.model,
      'output',
      ocrUsage.completionTokens,
    );

    const usage = {
      duration: end - start,
      inputTokens: ocrUsage.promptTokens,
      outputTokens: ocrUsage.completionTokens,
      totalTokens: ocrUsage.totalTokens,
      inputCost,
      outputCost,
      totalCost: inputCost + outputCost,
    };

    return {
      text,
      usage,
    };
  }

  async extractFromText(text: string, schema: JsonSchema) {
    const modelProvider = createModelProvider(this.model);

    const messages: CoreMessage[] = [
      { role: 'system', content: JSON_EXTRACTION_SYSTEM_PROMPT },
      { role: 'user', content: text },
    ];

    const zodSchema = generateZodSchema(schema);

    const start = performance.now();

    const { object: json, usage: extractionUsage } = await generateObject({
      model: modelProvider(this.model),
      messages,
      schema: zodSchema,
      temperature: 0,
    });

    const end = performance.now();
    const inputCost = calculateTokenCost(
      this.model,
      'input',
      extractionUsage.promptTokens,
    );
    const outputCost = calculateTokenCost(
      this.model,
      'output',
      extractionUsage.completionTokens,
    );

    const usage = {
      duration: end - start,
      inputTokens: extractionUsage.promptTokens,
      outputTokens: extractionUsage.completionTokens,
      totalTokens: extractionUsage.totalTokens,
      inputCost,
      outputCost,
      totalCost: inputCost + outputCost,
    };

    return {
      json,
      usage,
    };
  }

  async extractFromImage(imagePath: string, schema: JsonSchema) {
    const modelProvider = createModelProvider(this.model);

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

    const start = performance.now();
    const { object: json, usage: extractionUsage } = await generateObject({
      model: modelProvider(this.model),
      messages,
      schema: zodSchema,
    });
    const end = performance.now();

    const usage = {
      duration: end - start,
      inputTokens: extractionUsage.promptTokens,
      outputTokens: extractionUsage.completionTokens,
      totalTokens: extractionUsage.totalTokens,
      inputCost: calculateTokenCost(this.model, 'input', extractionUsage.promptTokens),
      outputCost: calculateTokenCost(
        this.model,
        'output',
        extractionUsage.completionTokens,
      ),
      totalCost: extractionUsage.promptTokens + extractionUsage.completionTokens,
    };

    return {
      json,
      usage,
    };
  }
}
