import axios from 'axios';
import { ExtractionResult, OcrResult, Usage, JsonSchema } from '../types';
import { BaseModel } from './base';

interface ExtractResponse {
  jobId: string;
  result: Record<string, any>;
  status: string;
}

export class OmniAI extends BaseModel {
  constructor() {
    if (!process.env.OMNIAI_API_KEY) {
      throw new Error('Missing OMNIAI_API_KEY in .env');
    }

    super();
  }

  async ocr(imagePath: string): Promise<OcrResult> {
    // Implement OpenAI OCR logic here
    throw new Error('Method not implemented.');
  }

  async extract(text: string, schema: JsonSchema): Promise<ExtractionResult> {
    // Implement OpenAI extraction logic here
    throw new Error('Method not implemented.');
  }

  async ocrAndExtract(
    imagePath: string,
    schema: JsonSchema,
  ): Promise<{ json: Record<string, any>; text?: string; usage: Usage }> {
    const { result } = await extractFromImage(imagePath, schema);

    return {
      text: result.ocr,
      json: result.extracted,
      usage: {
        duration: 0,
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
      },
    };
  }
}

export async function extractFromImage(
  imageUrl: string,
  schema: JsonSchema,
): Promise<ExtractResponse> {
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

    return await pollForResults(jobId, apiKey);
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(
        `Failed to extract from image: ${JSON.stringify(error.response?.data) || JSON.stringify(error.message)}`,
      );
    }
    throw error;
  }
}

async function pollForResults(
  jobId: string,
  apiKey: string,
  maxAttempts = 50,
  intervalMs = 1000,
): Promise<ExtractResponse> {
  let attempts = 0;

  while (attempts < maxAttempts) {
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
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
      attempts++;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(
          `Failed to poll results: ${error.response?.data || error.message}`,
        );
      }
      throw error;
    }
  }

  throw new Error(`Polling timed out after ${maxAttempts} attempts`);
}
