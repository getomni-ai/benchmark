import { zerox } from 'zerox';

import { ExtractParams, ExtractionResult } from '../types';

export const extractZerox = async ({
  imagePath,
  outputDir,
}: ExtractParams): Promise<ExtractionResult> => {
  const startTime = performance.now();

  const result = await zerox({
    filePath: imagePath,
    openaiAPIKey: process.env.OPENAI_API_KEY,
  });

  const endTime = performance.now();
  const text = result.pages.map((page) => page.content).join('\n');

  return {
    text,
    json: {},
    usage: {
      duration: endTime - startTime,
      inputTokens: result.inputTokens,
      outputTokens: result.outputTokens,
      totalTokens: result.inputTokens + result.outputTokens,
    },
  };
};
