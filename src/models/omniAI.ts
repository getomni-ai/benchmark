import axios from 'axios';
import path from 'path';

import { ExtractionResult, Usage, JsonSchema } from '../types';
import { writeResultToFile } from '../utils';
import { ModelProvider } from './base';

// https://getomni.ai/pricing
// 1 cent per page
const COST_PER_PAGE = 0.01;

interface ExtractResponse {
  jobId: string;
  result: Record<string, any>;
  status: string;
}

const MAX_ATTEMPTS = 200; // 10 minutes
const POLL_INTERVAL = 3000;

export const sendExtractRequest = async (
  imageUrl: string,
  schema?: JsonSchema,
): Promise<ExtractResponse> => {
  const apiKey = process.env.OMNIAI_API_KEY;
  if (!apiKey) {
    throw new Error('Missing OMNIAI_API_KEY in .env');
  }

  const formData = new FormData();
  formData.append('url', imageUrl);

  // Add optional parameters if provided
  if (schema) {
    formData.append('schema', JSON.stringify(schema));
  }

  try {
    const response = await axios.post(`${process.env.OMNIAI_API_URL}/extract`, formData, {
      headers: {
        'x-api-key': apiKey,
        'Content-Type': 'multipart/form-data',
      },
    });

    const jobId = response.data.jobId;

    return await pollForResults(jobId);
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(
        `Failed to extract from image: ${JSON.stringify(error.response?.data) || JSON.stringify(error.message)}`,
      );
    }
    throw error;
  }
};

const pollForResults = async (jobId: string): Promise<ExtractResponse> => {
  let attempts = 0;
  const apiKey = process.env.OMNIAI_API_KEY;

  while (attempts < MAX_ATTEMPTS) {
    try {
      const response = await axios.get(
        `${process.env.OMNIAI_API_URL}/extract?jobId=${jobId}`,
        {
          headers: {
            'x-api-key': apiKey,
          },
        },
      );

      const result = response.data;

      if (result.status === 'COMPLETE') {
        return result;
      } else if (result.status === 'ERROR') {
        throw new Error(`Extraction failed: ${result.error || 'Unknown error'}`);
      }

      // Wait before next attempt
      await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL));
      attempts++;
    } catch (error) {
      throw `Failed to poll results: ${error}`;
    }
  }

  throw new Error(`Polling timed out after ${MAX_ATTEMPTS} attempts`);
};

export class OmniAIProvider extends ModelProvider {
  constructor(model: string) {
    super(model);
  }

  async ocr(imagePath: string) {
    const start = performance.now();
    const { result } = await sendExtractRequest(imagePath);
    const end = performance.now();

    const text = result.ocr.pages.map((page) => page.content).join('\n');
    const inputTokens = result.ocr.inputTokens;
    const outputTokens = result.ocr.outputTokens;

    return {
      text,
      usage: {
        duration: end - start,
        inputTokens,
        outputTokens,
        totalTokens: inputTokens + outputTokens,
        totalCost: COST_PER_PAGE,
      },
    };
  }

  async extractFromImage(imagePath: string, schema?: JsonSchema) {
    const start = performance.now();
    const { result } = await sendExtractRequest(imagePath, schema);
    const end = performance.now();

    const inputToken = result.inputTokens;
    const outputToken = result.outputTokens;

    return {
      json: result.extracted || {},
      usage: {
        duration: end - start,
        inputTokens: inputToken,
        outputTokens: outputToken,
        totalTokens: inputToken + outputToken,
        totalCost: 0, // TODO: extraction cost is included in the OCR cost, 1 cent per page
      },
    };
  }
}
