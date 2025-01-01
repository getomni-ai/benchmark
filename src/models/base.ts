import { JsonSchema, Usage } from '../types';

export class ModelProvider {
  model: string;
  outputDir?: string;

  constructor(model: string, outputDir?: string) {
    this.model = model;
    this.outputDir = outputDir;
  }

  async ocr(imagePath: string): Promise<{
    text: string;
    usage: Usage;
  }> {
    throw new Error('Not implemented');
  }

  async extractFromText?(
    text: string,
    schema: JsonSchema,
  ): Promise<{
    json: Record<string, any>;
    usage: Usage;
  }> {
    throw new Error('Not implemented');
  }

  async extractFromImage?(
    imagePath: string,
    schema: JsonSchema,
  ): Promise<{
    json: Record<string, any>;
    usage: Usage;
  }> {
    throw new Error('Not implemented');
  }
}
