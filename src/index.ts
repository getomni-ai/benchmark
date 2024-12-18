import dotenv from 'dotenv';
import path from 'path';
import moment from 'moment';
import cliProgress from 'cli-progress';

import Data from '../data/data.json';

import { calculateJsonAccuracy, calculateLevenshteinDistance } from './evaluation';
import { getModelProvider } from './models';
import { Input } from './types';
import { createResultFolder, writeToFile } from './utils';

dotenv.config();

const MODELS = ['gpt-4o', 'omniai'];
const DIRECT_IMAGE_EXTRACTION = false;

const timestamp = moment(new Date()).format('YYYY-MM-DD-HH-mm-ss');
const resultFolder = createResultFolder(timestamp);

const runBenchmark = async () => {
  const data = Data as Input;
  const results = [];

  // Create a progress bar
  const progressBar = new cliProgress.SingleBar({
    format: 'Progress |{bar}| {percentage}% | {value}/{total}',
    barCompleteChar: '\u2588',
    barIncompleteChar: '\u2591',
  });

  // Start the progress bar
  progressBar.start(MODELS.length, 0);

  for (const model of MODELS) {
    const modelProvider = getModelProvider(model);

    const result = {
      fileUrl: data.imageUrl,
      model,
      directImageExtraction: DIRECT_IMAGE_EXTRACTION,
      trueMarkdown: data.trueMarkdownOutput,
      trueJson: data.trueJsonOutput,
      predictedMarkdown: '',
      predictedJson: {},
      levenshteinDistance: 0,
      jsonAccuracy: 0,
      jsonDiff: {},
    };

    const extractionResult = await modelProvider({
      imagePath: data.imageUrl,
      schema: data.jsonSchema,
      directImageExtraction: DIRECT_IMAGE_EXTRACTION,
      model,
    });
    result.predictedMarkdown = extractionResult.text;
    result.predictedJson = extractionResult.json;

    // evaluate results
    const levenshteinDistance = calculateLevenshteinDistance(
      data.trueMarkdownOutput,
      extractionResult.text,
    );
    result.levenshteinDistance = levenshteinDistance;

    const accuracy = calculateJsonAccuracy(extractionResult.json, data.trueJsonOutput);
    result.jsonAccuracy = accuracy.score;
    result.jsonDiff = accuracy.jsonDiff;

    results.push(result);
    // Update progress bar instead of console.log
    progressBar.increment();
  }

  // Stop the progress bar
  progressBar.stop();

  writeToFile(path.join(resultFolder, 'results.json'), results);
};
runBenchmark();
