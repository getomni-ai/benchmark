import { AzureKeyCredential } from '@azure/core-auth';
import DocumentIntelligence, {
  DocumentIntelligenceClient,
  getLongRunningPoller,
  isUnexpected,
  AnalyzeOperationOutput,
} from '@azure-rest/ai-document-intelligence';

import { ModelProvider } from './base';

// https://azure.microsoft.com/en-us/pricing/details/ai-document-intelligence/
// $10 per 1000 pages for the first 1M pages, Prebuilt-Layout model
const COST_PER_PAGE = 10 / 1000;

export class AzureDocumentIntelligenceProvider extends ModelProvider {
  private client: DocumentIntelligenceClient;

  constructor() {
    super('azure-document-intelligence');

    const endpoint = process.env.AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT;
    const apiKey = process.env.AZURE_DOCUMENT_INTELLIGENCE_KEY;

    if (!endpoint || !apiKey) {
      throw new Error('Missing required Azure Document Intelligence configuration');
    }

    this.client = DocumentIntelligence(endpoint, new AzureKeyCredential(apiKey));
  }

  async ocr(imagePath: string) {
    try {
      const start = performance.now();

      const initialResponse = await this.client
        .path('/documentModels/{modelId}:analyze', 'prebuilt-layout')
        .post({
          contentType: 'application/json',
          body: {
            urlSource: imagePath,
          },
          queryParameters: { outputContentFormat: 'markdown' },
        });

      if (isUnexpected(initialResponse)) {
        throw initialResponse.body.error;
      }

      const poller = getLongRunningPoller(this.client, initialResponse);
      const result = (await poller.pollUntilDone()).body as AnalyzeOperationOutput;
      const analyzeResult = result.analyzeResult;
      const text = analyzeResult?.content;

      const end = performance.now();

      return {
        text,
        usage: {
          duration: end - start,
          totalCost: COST_PER_PAGE, // the input is always 1 page.
        },
      };
    } catch (error) {
      console.error('Azure Document Intelligence Error:', error);
      throw error;
    }
  }
}
