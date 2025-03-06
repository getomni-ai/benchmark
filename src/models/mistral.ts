import { Mistral } from '@mistralai/mistralai';

import { ModelProvider } from './base';

// $1.00 per 1000 images
const COST_PER_IMAGE = 0.001;

export class MistralProvider extends ModelProvider {
  private client: Mistral;

  constructor() {
    super('mistral-ocr');

    const apiKey = process.env.MISTRAL_API_KEY;

    if (!apiKey) {
      throw new Error('Missing required Mistral API key');
    }

    this.client = new Mistral({
      apiKey,
    });
  }

  async ocr(imagePath: string) {
    try {
      const start = performance.now();

      const response = await this.client.ocr.process({
        model: 'mistral-ocr-latest',
        document: {
          imageUrl: imagePath,
        },
        includeImageBase64: true,
      });

      const text = response.pages.map((page) => page.markdown).join('\n');
      const end = performance.now();

      const imageBase64s = response.pages.flatMap((page) =>
        page.images.map((image) => image.imageBase64).filter((base64) => base64),
      );

      return {
        text,
        imageBase64s,
        usage: {
          duration: end - start,
          totalCost: COST_PER_IMAGE,
        },
      };
    } catch (error) {
      console.error('Mistral OCR Error:', error);
      throw error;
    }
  }
}
