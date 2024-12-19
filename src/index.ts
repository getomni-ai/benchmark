import dotenv from 'dotenv';
import path from 'path';
import moment from 'moment';
import cliProgress from 'cli-progress';
import { isEmpty } from 'lodash';

import { calculateJsonAccuracy, calculateTextSimilarity } from './evaluation';
import { getModelProvider } from './models';
import { Input } from './types';
import { createResultFolder, loadData, writeToFile } from './utils';

dotenv.config();

/* -------------------------------------------------------------------------- */
/*                                Benchmark Config                            */
/* -------------------------------------------------------------------------- */

// const MODELS = ['gpt-4o', 'omniai', 'claude-3-5-sonnet-20241022'];
const MODELS = ['gpt-4o'];

const DIRECT_IMAGE_EXTRACTION = false; // if true, image -> json, otherwise image -> markdown -> json

const DATA_FOLDER = path.join(__dirname, '../data');

/* -------------------------------------------------------------------------- */
/*                                Run Benchmark                               */
/* -------------------------------------------------------------------------- */

const timestamp = moment(new Date()).format('YYYY-MM-DD-HH-mm-ss');
const resultFolder = createResultFolder(timestamp);

const runBenchmark = async () => {
  const inputs = loadData(DATA_FOLDER) as Input[];
  const results = [];

  // Create a progress bar
  const progressBar = new cliProgress.SingleBar({
    format: 'Progress |{bar}| {percentage}% | {value}/{total}',
    barCompleteChar: '\u2588',
    barIncompleteChar: '\u2591',
  });

  // Start the progress bar
  progressBar.start(MODELS.length * inputs.length, 0);

  for (const model of MODELS) {
    for (const data of inputs) {
      const modelProvider = getModelProvider(model);

      const result = {
        fileUrl: data.imageUrl,
        model,
        directImageExtraction: DIRECT_IMAGE_EXTRACTION,
        trueMarkdown: data.trueMarkdownOutput,
        trueJson: data.trueJsonOutput,
        predictedMarkdown: undefined,
        predictedJson: undefined,
        levenshteinDistance: undefined,
        jsonAccuracy: undefined,
        jsonDiff: undefined,
        jsonDiffStats: undefined,
        usage: undefined,
      };

      // extract text and json
      const extractionResult = await modelProvider({
        imagePath: data.imageUrl,
        schema: data.jsonSchema,
        directImageExtraction: DIRECT_IMAGE_EXTRACTION,
        outputDir: resultFolder,
        model,
      });
      result.predictedMarkdown = extractionResult.text;
      result.predictedJson = extractionResult.json;
      result.usage = extractionResult.usage;

      // evaluate text extraction
      const levenshteinDistance = calculateTextSimilarity(
        data.trueMarkdownOutput,
        extractionResult.text,
      );
      result.levenshteinDistance = levenshteinDistance;

      // evaluate json extraction
      if (!isEmpty(extractionResult.json)) {
        const accuracy = calculateJsonAccuracy(
          extractionResult.json,
          data.trueJsonOutput,
        );
        result.jsonAccuracy = accuracy.score;
        result.jsonDiff = accuracy.jsonDiff;
        result.jsonDiffStats = accuracy.jsonDiffStats;
      }

      results.push(result);
      progressBar.increment();
    }
  }

  // Stop the progress bar
  progressBar.stop();

  writeToFile(path.join(resultFolder, 'results.json'), results);
};
runBenchmark();
