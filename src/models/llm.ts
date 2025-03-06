import {
  generateText,
  generateObject,
  CoreMessage,
  CoreUserMessage,
  NoObjectGeneratedError,
} from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createDeepSeek } from '@ai-sdk/deepseek';
import { createAzure } from '@ai-sdk/azure';

import { ExtractionResult, JsonSchema } from '../types';
import { generateZodSchema, writeResultToFile } from '../utils';
import { calculateTokenCost } from './shared';
import { ModelProvider } from './base';
import {
  OCR_SYSTEM_PROMPT,
  JSON_EXTRACTION_SYSTEM_PROMPT,
  IMAGE_EXTRACTION_SYSTEM_PROMPT,
} from './shared';
import {
  OPENAI_MODELS,
  ANTHROPIC_MODELS,
  GOOGLE_GENERATIVE_AI_MODELS,
  FINETUNED_MODELS,
  DEEPSEEK_MODELS,
  AZURE_OPENAI_MODELS,
} from './registry';

export const createModelProvider = (model: string) => {
  if (OPENAI_MODELS.includes(model)) {
    return createOpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      baseURL: process.env.OPENAI_ENDPOINT || 'https://api.openai.com/v1',
    });
  }
  if (AZURE_OPENAI_MODELS.includes(model)) {
    return createAzure({
      apiKey: process.env.AZURE_OPENAI_API_KEY,
      resourceName: process.env.AZURE_OPENAI_RESOURCE_NAME,
    });
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
  if (DEEPSEEK_MODELS.includes(model)) {
    return createDeepSeek({ apiKey: process.env.DEEPSEEK_API_KEY });
  }
  throw new Error(`Model '${model}' does not support image inputs`);
};

export class LLMProvider extends ModelProvider {
  constructor(model: string) {
    if (AZURE_OPENAI_MODELS.includes(model)) {
      const openaiModel = model.replace('azure-', '');
      super(openaiModel);
    } else {
      super(model);
    }
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

  async extractFromText(text: string, schema: JsonSchema, imageBase64s?: string[]) {
    const modelProvider = createModelProvider(this.model);

    let imageMessages: CoreMessage[] = [];
    if (imageBase64s && imageBase64s.length > 0) {
      imageMessages = [
        {
          role: 'user',
          content: imageBase64s.map((base64) => ({
            type: 'image',
            image: base64,
          })),
        },
      ];
    }
    const messages: CoreMessage[] = [
      { role: 'system', content: JSON_EXTRACTION_SYSTEM_PROMPT },
      ...imageMessages,
      { role: 'user', content: text },
    ];

    const zodSchema = generateZodSchema(schema);

    const start = performance.now();

    let json, extractionUsage;
    try {
      const { object, usage } = await generateObject({
        model: modelProvider(this.model),
        messages,
        schema: zodSchema,
        temperature: 0,
      });
      json = object;
      extractionUsage = usage;
    } catch (error) {
      // if cause is AI_TypeValidationError, then still parse the json
      if (error instanceof NoObjectGeneratedError) {
        const errorText = error.text;
        json = JSON.parse(errorText);
        extractionUsage = error.usage;
      } else {
        throw error;
      }
    }

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
      { role: 'system', content: IMAGE_EXTRACTION_SYSTEM_PROMPT },
      imageMessage,
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
}
