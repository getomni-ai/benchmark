import { DocumentProcessorServiceClient } from '@google-cloud/documentai';
import { ModelProvider } from './base';

// https://cloud.google.com/document-ai/pricing
// $1.5 per 1000 pages for the first 5M pages
const COST_PER_PAGE = 1.5 / 1000;

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

      // Determine MIME type from URL
      const mimeType = this.getMimeType(imagePath);

      const request = {
        name: this.processorPath,
        rawDocument: {
          content: imageContent,
          mimeType: mimeType,
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
          totalCost: COST_PER_PAGE, // the input is always 1 page.
        },
      };
    } catch (error) {
      console.error('Google Document AI Error:', error);
      throw error;
    }
  }

  private getMimeType(url: string): string {
    const extension = url.split('.').pop()?.toLowerCase();
    switch (extension) {
      case 'pdf':
        return 'application/pdf';
      case 'png':
        return 'image/png';
      case 'jpg':
      case 'jpeg':
        return 'image/jpeg';
      case 'tiff':
      case 'tif':
        return 'image/tiff';
      case 'gif':
        return 'image/gif';
      case 'bmp':
        return 'image/bmp';
      default:
        return 'image/png'; // default to PNG
    }
  }
}
