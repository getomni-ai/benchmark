import { zerox } from 'zerox';

import { ModelProvider } from './base';
import { calculateTokenCost } from './shared';

export class ZeroxProvider extends ModelProvider {
  constructor() {
    super('zerox');
  }

  async ocr(imagePath: string) {
    const startTime = performance.now();

    const result = await zerox({
      filePath: imagePath,
      openaiAPIKey: process.env.OPENAI_API_KEY,
    });

    const endTime = performance.now();

    const text = result.pages.map((page) => page.content).join('\n');

    const inputCost = calculateTokenCost(this.model, 'input', result.inputTokens);
    const outputCost = calculateTokenCost(this.model, 'output', result.outputTokens);

    const usage = {
      duration: endTime - startTime,
      inputTokens: result.inputTokens,
      outputTokens: result.outputTokens,
      totalTokens: result.inputTokens + result.outputTokens,
      inputCost,
      outputCost,
      totalCost: inputCost + outputCost,
    };

    return {
      text,
      usage,
    };
  }
}
