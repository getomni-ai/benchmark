import dotenv from 'dotenv';
import path from 'path';
import moment from 'moment';

import Data from '../data/data.json';
import { calculateJsonAccuracy, calculateLevenshteinDistance } from './evaluation';
import { createModelInstance } from './models';
import { Input, EXTRACT_STRATEGY } from './types';
import { createResultFolder, writeToFile } from './utils';

dotenv.config();

const MODEL = 'gpt-4o';
const extractStrategy: EXTRACT_STRATEGY = EXTRACT_STRATEGY.TEXT_EXTRACTION;

const timestamp = moment(new Date()).format('YYYY-MM-DD HH:mm:ss');
const resultFolder = createResultFolder(timestamp);
const results: any[] = [];

const runBenchmark = async () => {
  const data = Data as Input;

  const model = createModelInstance(MODEL);
  const result = {
    fileUrl: data.imageUrl,
    model: MODEL,
    extractStrategy,
    trueMarkdown: data.trueMarkdownOutput,
    trueJson: data.trueJsonOutput,
    predictedMarkdown: '',
    predictedJson: {},
    levenshteinDistance: 0,
    jsonAccuracy: 0,
    jsonDiff: {},
  };

  if (extractStrategy === (EXTRACT_STRATEGY.TEXT_EXTRACTION as EXTRACT_STRATEGY)) {
    // OCR
    const { text, usage: ocrUsage } = await model.ocr(data.imageUrl);

    result.predictedMarkdown = text;

    const levenshteinDistance = calculateLevenshteinDistance(
      data.trueMarkdownOutput,
      text,
    );
    result.levenshteinDistance = levenshteinDistance;

    const { json, usage: extractionUsage } = await model.extract(text, data.jsonSchema);

    result.predictedJson = json;

    // evaluate the object
    const accuracy = calculateJsonAccuracy(json, data.trueJsonOutput);

    result.jsonAccuracy = accuracy.score;
    result.jsonDiff = accuracy.jsonDiff;
  } else {
    const {
      text,
      json,
      usage: ocrUsage,
    } = await model.ocrAndExtract(data.imageUrl, data.jsonSchema);

    if (text) {
      result.predictedMarkdown = text;

      const levenshteinDistance = calculateLevenshteinDistance(
        data.trueMarkdownOutput,
        text,
      );
      result.levenshteinDistance = levenshteinDistance;
    }

    result.predictedJson = json;

    // evaluate the object
    const accuracy = calculateJsonAccuracy(json, data.trueJsonOutput);

    result.jsonAccuracy = accuracy.score;
    result.jsonDiff = accuracy.jsonDiff;
  }

  results.push(result);

  writeToFile(path.join(resultFolder, 'result.json'), result);
};

writeToFile(path.join(resultFolder, 'results.json'), results);

runBenchmark();
