import dotenv from 'dotenv';
import path from 'path';
import moment from 'moment';
import cliProgress from 'cli-progress';
import { isEmpty } from 'lodash';
import pLimit from 'p-limit';

import { calculateJsonAccuracy, calculateTextSimilarity } from './evaluation';
import { getModelProvider } from './models';
import { Input, Result } from './types';
import { createResultFolder, loadData, writeToFile } from './utils';

dotenv.config();

/* -------------------------------------------------------------------------- */
/*                                Benchmark Config                            */
/* -------------------------------------------------------------------------- */

const MODELS = ['gpt-4o', 'omniai', 'claude-3-5-sonnet-20241022'];

const MODEL_CONCURRENCY = {
  'gpt-4o': 50,
  omniai: 50,
  'claude-3-5-sonnet-20241022': 50,
  zerox: 50,
};

const MODEL_CONFIGS = [
  { ocr: 'gpt-4o', extraction: 'gpt-4o' },
  { ocr: 'omniai', extraction: 'omniai' },
  { ocr: 'claude-3-5-sonnet-20241022', extraction: 'claude-3-5-sonnet-20241022' },
];

// if true, image -> json, otherwise image -> markdown -> json
const DIRECT_IMAGE_EXTRACTION = false;

const DATA_FOLDER = path.join(__dirname, '../data');

/* -------------------------------------------------------------------------- */
/*                                Run Benchmark                               */
/* -------------------------------------------------------------------------- */

const timestamp = moment(new Date()).format('YYYY-MM-DD-HH-mm-ss');
const resultFolder = createResultFolder(timestamp);

const runBenchmark = async () => {
  const data = loadData(DATA_FOLDER) as Input[];
  const results: Result[] = [];

  // Create multiple progress bars
  const multibar = new cliProgress.MultiBar({
    format: '{model} |{bar}| {percentage}% | {value}/{total}',
    barCompleteChar: '\u2588',
    barIncompleteChar: '\u2591',
    clearOnComplete: false,
    hideCursor: true,
  });

  // Create progress bars for each model
  const progressBars = MODELS.reduce(
    (acc, model) => ({
      ...acc,
      [model]: multibar.create(data.length, 0, { model }),
    }),
    {},
  );

  const modelPromises = MODELS.map(async (model) => {
    // Calculate concurrent requests based on rate limit
    const concurrency = MODEL_CONCURRENCY[model as keyof typeof MODEL_CONCURRENCY] ?? 50;
    const limit = pLimit(concurrency);

    const promises = data.map((item) =>
      limit(async () => {
        const modelProvider = getModelProvider(model);
        const result: Result = {
          fileUrl: item.imageUrl,
          model,
          directImageExtraction: DIRECT_IMAGE_EXTRACTION,
          trueMarkdown: item.trueMarkdownOutput,
          trueJson: item.trueJsonOutput,
          predictedMarkdown: undefined,
          predictedJson: undefined,
          levenshteinDistance: undefined,
          jsonAccuracy: undefined,
          jsonDiff: undefined,
          jsonDiffStats: undefined,
          usage: undefined,
        };

        try {
          // extract text and json
          const extractionResult = await modelProvider({
            imagePath: item.imageUrl,
            schema: item.jsonSchema,
            directImageExtraction: DIRECT_IMAGE_EXTRACTION,
            outputDir: resultFolder,
            model,
          });

          // ... existing result processing ...
          result.predictedMarkdown = extractionResult.text;
          result.predictedJson = extractionResult.json;
          result.usage = extractionResult.usage;

          if (extractionResult.text) {
            result.levenshteinDistance = calculateTextSimilarity(
              item.trueMarkdownOutput,
              extractionResult.text,
            );
          }

          if (!isEmpty(extractionResult.json)) {
            const accuracy = calculateJsonAccuracy(
              extractionResult.json,
              item.trueJsonOutput,
            );
            result.jsonAccuracy = accuracy.score;
            result.jsonDiff = accuracy.jsonDiff;
            result.jsonDiffStats = accuracy.jsonDiffStats;
          }
        } catch (error) {
          console.error(`Error processing ${item.imageUrl} with ${model}:`, error);
        }

        // Update progress bar for this model
        progressBars[model].increment();
        return result;
      }),
    );

    // Process items concurrently for this model
    const modelResults = await Promise.all(promises);

    results.push(...modelResults);
  });

  // Process each model with its own concurrency limit
  await Promise.all(modelPromises);

  // Stop all progress bars
  multibar.stop();

  writeToFile(path.join(resultFolder, 'results.json'), results);
};

runBenchmark();
