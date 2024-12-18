import axios from 'axios';

import { ExtractParams, ExtractionResult, Usage, JsonSchema } from '../types';
import { writeResultToFile } from '../utils';

interface ExtractResponse {
  jobId: string;
  result: Record<string, any>;
  status: string;
}

const MAX_ATTEMPTS = 50;
const POLL_INTERVAL = 1000;

export const extractOmniAI = async ({
  imagePath,
  schema,
  outputDir,
}: ExtractParams): Promise<ExtractionResult> => {
  if (!process.env.OMNIAI_API_KEY) {
    throw new Error('Missing OMNIAI_API_KEY in .env');
  }

  const start = performance.now();
  const { result: omniResult } = await sendExtractRequest(imagePath, schema);
  const end = performance.now();

  const usage = calculateTokenUsage(omniResult);

  const result = {
    text: omniResult.ocr,
    json: omniResult.extracted || {},
    usage: {
      duration: end - start,
      inputTokens: usage.inputTokens,
      outputTokens: usage.outputTokens,
      totalTokens: usage.totalTokens,
    },
  };

  if (outputDir) {
    writeResultToFile(outputDir, result);
  }

  return result;
};

export const sendExtractRequest = async (
  imageUrl: string,
  schema: JsonSchema,
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

const calculateTokenUsage = (result: Record<string, any>): Usage => {
  const usage = {
    inputTokens: 0,
    outputTokens: 0,
    totalTokens: 0,
  };

  if (result.ocr) {
    usage.inputTokens = result.ocr.inputTokens || 0;
    usage.outputTokens = result.ocr.outputTokens || 0;
    usage.totalTokens = usage.inputTokens + usage.outputTokens;
  }

  if (result.extracted) {
    usage.inputTokens += result.extracted.inputTokens || 0;
    usage.outputTokens += result.extracted.outputTokens || 0;
    usage.totalTokens = usage.inputTokens + usage.outputTokens;
  }

  return usage;
};
