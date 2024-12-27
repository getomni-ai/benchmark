import { generateText, generateObject, CoreMessage } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { createAnthropic } from '@ai-sdk/anthropic';
import path from 'path';

import { ExtractParams, ExtractionResult, JsonSchema } from '../types';
import { generateZodSchema, writeResultToFile } from '../utils';
import { calculateTokenCost } from './shared';
import { ModelProvider } from './base';
import {
  OCR_SYSTEM_PROMPT,
  JSON_EXTRACTION_SYSTEM_PROMPT,
  IMAGE_EXTRACTION_SYSTEM_PROMPT,
} from './shared';
import { OPENAI_MODELS, ANTHROPIC_MODELS } from './registry';

export const createModelProvider = (model: string) => {
  if (OPENAI_MODELS.includes(model)) {
    return createOpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  if (ANTHROPIC_MODELS.includes(model)) {
    return createAnthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  throw new Error(`Model '${model}' does not support image inputs`);
};

export const extractWithAI = async ({
  imagePath,
  schema,
  outputDir,
  directImageExtraction = false,
  model = 'gpt-4o',
}: ExtractParams): Promise<ExtractionResult> => {
  const result: ExtractionResult = {
    text: '',
    json: {},
    usage: {},
  };

  const modelProvider = createModelProvider(model);
  const start = performance.now();

  if (directImageExtraction) {
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
    const { object, usage } = await generateObject({
      model: modelProvider(model),
      messages,
      schema: zodSchema,
    });

    const inputCost = calculateTokenCost(model, 'input', usage.promptTokens);
    const outputCost = calculateTokenCost(model, 'output', usage.completionTokens);

    result.json = object;
    result.usage = {
      duration: performance.now() - start,
      inputTokens: usage.promptTokens,
      outputTokens: usage.completionTokens,
      totalTokens: usage.totalTokens,
      inputCost,
      outputCost,
      totalCost: inputCost + outputCost,
    };
  } else {
    const ocrMessages: CoreMessage[] = [
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
      model: modelProvider(model),
      messages: ocrMessages,
    });
    const ocrInputCost = calculateTokenCost(model, 'input', ocrUsage.promptTokens);
    const ocrOutputCost = calculateTokenCost(model, 'output', ocrUsage.completionTokens);

    result.text = text;
    result.usage = {
      duration: performance.now() - start,
      inputTokens: ocrUsage.promptTokens,
      outputTokens: ocrUsage.completionTokens,
      totalTokens: ocrUsage.totalTokens,
      inputCost: ocrInputCost,
      outputCost: ocrOutputCost,
      totalCost: ocrInputCost + ocrOutputCost,
    };

    if (schema) {
      const jsonExtractionMessages: CoreMessage[] = [
        { role: 'system', content: JSON_EXTRACTION_SYSTEM_PROMPT },
        { role: 'user', content: text },
      ];

      const zodSchema = generateZodSchema(schema);

      const { object, usage: extractionUsage } = await generateObject({
        model: modelProvider(model),
        messages: jsonExtractionMessages,
        schema: zodSchema,
      });

      const jsonInputCost = calculateTokenCost(
        model,
        'input',
        extractionUsage.promptTokens,
      );
      const jsonOutputCost = calculateTokenCost(
        model,
        'output',
        extractionUsage.completionTokens,
      );

      result.json = object;
      result.usage = {
        duration: performance.now() - start,
        inputTokens: ocrUsage.promptTokens + extractionUsage.promptTokens,
        outputTokens: ocrUsage.completionTokens + extractionUsage.completionTokens,
        totalTokens: ocrUsage.totalTokens + extractionUsage.totalTokens,
        inputCost: ocrInputCost + jsonInputCost,
        outputCost: ocrOutputCost + jsonOutputCost,
        totalCost: ocrInputCost + ocrOutputCost + jsonInputCost + jsonOutputCost,
      };
    }
  }

  if (outputDir) {
    writeResultToFile(
      outputDir,
      path.basename(imagePath, path.extname(imagePath)) + '.json',
      result,
    );
  }

  return result;
};

export class LLMProvider extends ModelProvider {
  constructor(model: string) {
    super(model);
  }

  async ocr(imagePath: string) {
    const modelProvider = createModelProvider(this.model);

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

    const start = performance.now();
    const { text, usage: ocrUsage } = await generateText({
      model: modelProvider(this.model),
      messages,
    });

    const usage = {
      duration: performance.now() - start,
      inputTokens: ocrUsage.promptTokens,
      outputTokens: ocrUsage.completionTokens,
      totalTokens: ocrUsage.totalTokens,
      inputCost: calculateTokenCost(this.model, 'input', ocrUsage.promptTokens),
      outputCost: calculateTokenCost(this.model, 'output', ocrUsage.completionTokens),
      totalCost: ocrUsage.promptTokens + ocrUsage.completionTokens,
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

    const start = performance.now();

    const zodSchema = generateZodSchema(schema);

    const { object, usage: extractionUsage } = await generateObject({
      model: modelProvider(this.model),
      messages,
      schema: zodSchema,
    });

    const usage = {
      duration: performance.now() - start,
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
      object,
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
    const { object, usage: extractionUsage } = await generateObject({
      model: modelProvider(this.model),
      messages,
      schema: zodSchema,
    });

    const usage = {
      duration: performance.now() - start,
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
      object,
      usage,
    };
  }
}
