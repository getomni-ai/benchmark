import { Usage } from './model';

export interface Input {
  imageUrl: string;
  metadata: Metadata;
  jsonSchema: JsonSchema;
  trueJsonOutput: Record<string, any>;
  trueMarkdownOutput: string;
}

export interface Metadata {
  orientation?: number;
  documentQuality?: string;
  resolution?: number[];
  language?: string;
}

export interface JsonSchema {
  type: string;
  description?: string;
  properties?: Record<string, JsonSchema>;
  items?: JsonSchema;
  required?: string[];
}

export interface Result {
  fileUrl: string;
  ocrModel: string;
  extractionModel: string;
  directImageExtraction?: boolean;
  trueMarkdown: string;
  trueJson: Record<string, any>;
  predictedMarkdown?: string;
  predictedJson?: Record<string, any>;
  levenshteinDistance?: number;
  jsonAccuracy?: number;
  jsonDiff?: Record<string, any>;
  jsonDiffStats?: Record<string, any>;
  usage?: Usage;
}
