import dotenv from 'dotenv';
import fs from 'fs';

import Data from '../data/data.json';
import { calculateJsonAccuracy, calculateLevenshteinDistance } from './evaluation';
import { createModelInstance } from './models';
import { Input, EXTRACT_STRATEGY } from './types';
import { generateZodSchema } from './utils';

dotenv.config();

const MODEL = 'gpt-4o';
const extractStrategy: EXTRACT_STRATEGY = EXTRACT_STRATEGY.IMAGE_EXTRACTION;

const runBenchmark = async () => {
  const data = Data as Input;

  const model = createModelInstance(MODEL);

  if (extractStrategy === (EXTRACT_STRATEGY.TEXT_EXTRACTION as EXTRACT_STRATEGY)) {
    // OCR
    const { text, usage: ocrUsage } = await model.ocr(data.imageUrl);

    console.log('ocr completed');

    const levenshteinDistance = calculateLevenshteinDistance(
      data.trueMarkdownOutput,
      text,
    );
    console.log('levenshtein distance', levenshteinDistance);

    const { json, usage: extractionUsage } = await model.extract(text, data.jsonSchema);

    console.log('true json output', data.trueJsonOutput);
    console.log('json output', json);

    // evaluate the object
    const accuracy = calculateJsonAccuracy(json, data.trueJsonOutput);

    console.log('accuracy', accuracy);
  } else {
    const { json, usage: ocrUsage } = await model.ocrAndExtract(
      data.imageUrl,
      data.jsonSchema,
    );

    console.log('ocr and extraction completed');
    console.log('json', json);
    console.log('ocrUsage', ocrUsage);

    // evaluate the object
    const accuracy = calculateJsonAccuracy(json, data.trueJsonOutput);

    console.log('accuracy', accuracy);
  }
};

runBenchmark();
