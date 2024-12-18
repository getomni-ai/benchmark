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
