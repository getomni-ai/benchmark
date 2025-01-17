import { TextractClient, AnalyzeDocumentCommand } from '@aws-sdk/client-textract';
import { ModelProvider } from './base';

// https://aws.amazon.com/textract/pricing/
// $4 per 1000 pages for the first 1M pages, Layout model
const COST_PER_PAGE = 4 / 1000;

export class AWSTextractProvider extends ModelProvider {
  private client: TextractClient;

  constructor() {
    super('aws-textract');
    this.client = new TextractClient({
      region: process.env.AWS_REGION,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      },
    });
  }

  async ocr(imagePath: string) {
    try {
      // Convert image URL to base64
      const response = await fetch(imagePath);
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      const start = performance.now();
      const command = new AnalyzeDocumentCommand({
        Document: {
          Bytes: buffer,
        },
        FeatureTypes: ['LAYOUT'],
      });

      const result = await this.client.send(command);
      const end = performance.now();

      // Extract text from blocks
      const text =
        result.Blocks?.filter((block) => block.Text)
          .map((block) => block.Text)
          .join('\n') || '';

      return {
        text,
        usage: {
          duration: end - start,
          totalCost: COST_PER_PAGE, // the input is always 1 page.
        },
      };
    } catch (error) {
      console.error('AWS Textract Error:', error);
      throw error;
    }
  }
}
