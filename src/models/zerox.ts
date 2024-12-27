import { zerox } from 'zerox';

import { ModelProvider } from './base';
import { calculateTokenCost } from './shared';

export class ZeroxProvider extends ModelProvider {
  constructor(model: string) {
    super(model);
  }

  async ocr(imagePath: string) {
    const startTime = performance.now();

    const result = await zerox({
      filePath: imagePath,
      openaiAPIKey: process.env.OPENAI_API_KEY,
    });

    const text = result.pages.map((page) => page.content).join('\n');

    const usage = {
      duration: performance.now() - startTime,
      inputTokens: result.inputTokens,
      outputTokens: result.outputTokens,
      totalTokens: result.inputTokens + result.outputTokens,
      inputCost: calculateTokenCost(this.model, 'input', result.inputTokens),
      outputCost: calculateTokenCost(this.model, 'output', result.outputTokens),
      totalCost: result.inputTokens + result.outputTokens,
    };

    return {
      text,
      usage,
    };
  }
}
