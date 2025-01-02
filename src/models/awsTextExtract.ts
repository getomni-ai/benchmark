import { TextractClient, AnalyzeDocumentCommand } from '@aws-sdk/client-textract';
import { ModelProvider } from './base';

export class AWSTextractProvider extends ModelProvider {
  private client: TextractClient;

  constructor() {
    super('aws-text-extract');
    this.client = new TextractClient({
      region: process.env.AWS_REGION,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      },
    });
  }

  async ocr(imagePath: string) {
    const start = performance.now();

    try {
      // Convert image URL to base64
      const response = await fetch(imagePath);
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      const command = new AnalyzeDocumentCommand({
        Document: {
          Bytes: buffer,
        },
        FeatureTypes: ['FORMS', 'TABLES', 'SIGNATURES', 'LAYOUT'],
      });

      const result = await this.client.send(command);

      // Extract text from blocks
      const text =
        result.Blocks?.filter((block) => block.Text)
          .map((block) => block.Text)
          .join('\n') || '';

      return {
        text,
        usage: {
          duration: performance.now() - start,
        },
      };
    } catch (error) {
      console.error('AWS Textract Error:', error);
      throw error;
    }
  }
}
