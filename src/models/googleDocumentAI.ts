import { DocumentProcessorServiceClient } from '@google-cloud/documentai';
import { ModelProvider } from './base';

export class GoogleDocumentAIProvider extends ModelProvider {
  private client: DocumentProcessorServiceClient;
  private processorPath: string;

  constructor() {
    super('google-document-ai');

    const projectId = process.env.GOOGLE_PROJECT_ID;
    const location = process.env.GOOGLE_LOCATION || 'us'; // default to 'us'
    const processorId = process.env.GOOGLE_PROCESSOR_ID;

    if (!projectId || !processorId) {
      throw new Error('Missing required Google Document AI configuration');
    }

    this.client = new DocumentProcessorServiceClient();
    this.processorPath = `projects/${projectId}/locations/${location}/processors/${processorId}`;
  }

  async ocr(imagePath: string) {
    const start = performance.now();

    try {
      // Download the image
      const response = await fetch(imagePath);
      const arrayBuffer = await response.arrayBuffer();
      const imageContent = Buffer.from(arrayBuffer).toString('base64');

      const request = {
        name: this.processorPath,
        rawDocument: {
          content: imageContent,
          //   mimeType: 'application/pdf', // Adjust based on your input type
        },
      };

      const [result] = await this.client.processDocument(request);
      const { document } = result;

      // Extract text from the document
      const text = document?.text || '';

      return {
        text,
        usage: {
          duration: performance.now() - start,
        },
      };
    } catch (error) {
      console.error('Google Document AI Error:', error);
      throw error;
    }
  }
}
