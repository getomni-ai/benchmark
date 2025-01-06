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

const MODEL_CONCURRENCY = {
  'gpt-4o': 50,
  omniai: 50,
  'claude-3-5-sonnet-20241022': 50,
  zerox: 50,
};

const MODELS: { ocr: string; extraction?: string }[] = [
  // { ocr: 'gpt-4o', extraction: 'gpt-4o' },
  // { ocr: 'omniai', extraction: 'omniai' },
  // { ocr: 'claude-3-5-sonnet-20241022', extraction: 'claude-3-5-sonnet-20241022' },
  // { ocr: 'aws-text-extract', extraction: 'gpt-4o' },
  // { ocr: 'google-document-ai' },
  // { ocr: 'azure-document-intelligence' },
  { ocr: 'gemini-1.5-pro', extraction: 'gemini-1.5-pro' },
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
      [`${model.ocr}-${model.extraction}`]: multibar.create(data.length, 0, {
        model: `${model.ocr} -> ${model.extraction}`,
      }),
    }),
    {},
  );

  const modelPromises = MODELS.map(
    async ({ ocr: ocrModel, extraction: extractionModel }) => {
      // Calculate concurrent requests based on rate limit
      const concurrency = Math.min(
        MODEL_CONCURRENCY[ocrModel as keyof typeof MODEL_CONCURRENCY] ?? 50,
        MODEL_CONCURRENCY[extractionModel as keyof typeof MODEL_CONCURRENCY] ?? 50,
      );
      const limit = pLimit(concurrency);

      const promises = data.map((item) =>
        limit(async () => {
          const ocrModelProvider = getModelProvider(ocrModel);
          const extractionModelProvider = extractionModel
            ? getModelProvider(extractionModel)
            : undefined;

          const result: Result = {
            fileUrl: item.imageUrl,
            ocrModel,
            extractionModel,
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
            const start = performance.now();
            const ocrResult = await ocrModelProvider.ocr(item.imageUrl);

            result.predictedMarkdown = ocrResult.text;
            result.usage = ocrResult.usage;

            let extractionResult;
            if (extractionModelProvider) {
              if (extractionModel === 'omniai') {
                extractionResult = await extractionModelProvider.extractFromImage(
                  item.imageUrl,
                  item.jsonSchema,
                );
              } else {
                extractionResult = await extractionModelProvider.extractFromText(
                  ocrResult.text,
                  item.jsonSchema,
                );
              }
              result.predictedJson = extractionResult.json;
              result.usage = extractionResult.usage;
            }

            if (ocrResult.text) {
              result.levenshteinDistance = calculateTextSimilarity(
                item.trueMarkdownOutput,
                ocrResult.text,
              );
            }

            if (!isEmpty(result.predictedJson)) {
              const accuracy = calculateJsonAccuracy(
                result.predictedJson,
                item.trueJsonOutput,
              );
              result.jsonAccuracy = accuracy.score;
              result.jsonDiff = accuracy.jsonDiff;
              result.jsonDiffStats = accuracy.jsonDiffStats;
            }
          } catch (error) {
            console.error(
              `Error processing ${item.imageUrl} with ${ocrModel} and ${extractionModel}:\n`,
              error,
            );
          }

          // Update progress bar for this model
          progressBars[`${ocrModel}-${extractionModel}`].increment();
          return result;
        }),
      );

      // Process items concurrently for this model
      const modelResults = await Promise.all(promises);

      results.push(...modelResults);
    },
  );

  // Process each model with its own concurrency limit
  await Promise.all(modelPromises);

  // Stop all progress bars
  multibar.stop();

  writeToFile(path.join(resultFolder, 'results.json'), results);
};

runBenchmark();
