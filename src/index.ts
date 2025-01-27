import dotenv from 'dotenv';
import path from 'path';
import moment from 'moment';
import cliProgress from 'cli-progress';
import { isEmpty } from 'lodash';
import pLimit from 'p-limit';

import { calculateJsonAccuracy, calculateTextSimilarity } from './evaluation';
import { getModelProvider } from './models';
import { Result } from './types';
import { createResultFolder, loadLocalData, writeToFile, loadFromDb } from './utils';

dotenv.config();

/* -------------------------------------------------------------------------- */
/*                                Benchmark Config                            */
/* -------------------------------------------------------------------------- */

const MODEL_CONCURRENCY = {
  'aws-textract': 50,
  'azure-document-intelligence': 50,
  'claude-3-5-sonnet-20241022': 10,
  'gpt-4o': 50,
  omniai: 50,
  zerox: 50,
};

const MODELS: { ocr: string; extraction?: string }[] = [
  { ocr: 'ground-truth', extraction: 'gpt-4o' },
  // { ocr: 'ground-truth', extraction: 'claude-3-5-sonnet-20241022' },
  { ocr: 'gpt-4o', extraction: 'gpt-4o' },
  // { ocr: 'ft:gpt-4o-2024-08-06:omniai::AtOXM6UJ', extraction: 'gpt-4o' }, // 250 Full Dataaset
  // { ocr: 'ft:gpt-4o-2024-08-06:omniai::Arxk5CGQ', extraction: 'gpt-  4o' }, // 25
  // { ocr: 'ft:gpt-4o-2024-08-06:omniai::ArxtYMva', extraction: 'gpt-4o' }, // 50
  // { ocr: 'ft:gpt-4o-2024-08-06:omniai::ArxvfLvw', extraction: 'gpt-4o' }, // 100
  // { ocr: 'ft:gpt-4o-2024-08-06:omniai::AryLM0UQ', extraction: 'gpt-4o' }, // 250
  // { ocr: 'ft:gpt-4o-2024-08-06:omniai::Arz2HbeO', extraction: 'gpt-4o' }, // 500
  // { ocr: 'ft:gpt-4o-2024-08-06:omniai::Arz2HbeO', extraction: 'gpt-4o' }, // 500
  // { ocr: 'ft:gpt-4o-2024-08-06:omniai::Arzh2QBC', extraction: 'gpt-4o' }, // 1000
  // { ocr: 'gpt-4o-mini', extraction: 'gpt-4o' },
  // { ocr: 'zerox', extraction: 'gpt-4o' },
  // { ocr: 'omniai', extraction: 'omniai' },
  // { ocr: 'claude-3-5-sonnet-20241022', extraction: 'claude-3-5-sonnet-20241022' },
  // { ocr: 'claude-3-5-sonnet-20241022', extraction: 'claude-3-5-sonnet-20241022' },
  // { ocr: 'aws-textract', extraction: 'gpt-4o' },
  // { ocr: 'google-document-ai', extraction: 'gpt-4o' },
  // { ocr: 'azure-document-intelligence', extraction: 'gpt-4o' },
  // { ocr: 'unstructured', extraction: 'gpt-4o' },
];

// if true, image -> json, otherwise image -> markdown -> json
const DIRECT_IMAGE_EXTRACTION = false;

const DATA_FOLDER = path.join(__dirname, '../data');

const DATABASE_URL = process.env.DATABASE_URL;

const TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes in milliseconds

const withTimeout = async (promise: Promise<any>, operation: string) => {
  let timeoutId: NodeJS.Timeout;

  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(`${operation} operation timed out after ${TIMEOUT_MS}ms`));
    }, TIMEOUT_MS);
  });

  try {
    const result = await Promise.race([promise, timeoutPromise]);
    clearTimeout(timeoutId);
    return result;
  } catch (error) {
    clearTimeout(timeoutId);
    console.error(`Timeout error in ${operation}:`, error);
    throw error;
  }
};

/* -------------------------------------------------------------------------- */
/*                                Run Benchmark                               */
/* -------------------------------------------------------------------------- */

const timestamp = moment(new Date()).format('YYYY-MM-DD-HH-mm-ss');
const resultFolder = createResultFolder(timestamp);

const runBenchmark = async () => {
  const data = DATABASE_URL ? await loadFromDb() : loadLocalData(DATA_FOLDER);
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
        MODEL_CONCURRENCY[ocrModel as keyof typeof MODEL_CONCURRENCY] ?? 20,
        MODEL_CONCURRENCY[extractionModel as keyof typeof MODEL_CONCURRENCY] ?? 20,
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
            metadata: item.metadata,
            jsonSchema: item.jsonSchema,
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
            fullJsonDiff: undefined,
            jsonDiffStats: undefined,
            jsonAccuracyResult: undefined,
            usage: undefined,
          };

          try {
            if (ocrModel === 'ground-truth') {
              result.predictedMarkdown = item.trueMarkdownOutput;
            } else {
              const ocrResult = await withTimeout(
                ocrModelProvider.ocr(item.imageUrl),
                `OCR: ${ocrModel}`,
              );
              result.predictedMarkdown = ocrResult.text;
              result.usage = {
                ...ocrResult.usage,
                ocr: ocrResult.usage,
                extraction: undefined,
              };
            }

            let extractionResult;
            if (extractionModelProvider) {
              if (extractionModel === 'omniai') {
                extractionResult = await withTimeout(
                  extractionModelProvider.extractFromImage(
                    item.imageUrl,
                    item.jsonSchema,
                  ),
                  `JSON extraction: ${extractionModel}`,
                );
              } else {
                extractionResult = await withTimeout(
                  extractionModelProvider.extractFromText(
                    result.predictedMarkdown,
                    item.jsonSchema,
                  ),
                  `JSON extraction: ${extractionModel}`,
                );
              }
              result.predictedJson = extractionResult.json;

              const mergeUsage = (base: any, additional: any) => ({
                duration: (base?.duration ?? 0) + (additional?.duration ?? 0),
                inputTokens: (base?.inputTokens ?? 0) + (additional?.inputTokens ?? 0),
                outputTokens: (base?.outputTokens ?? 0) + (additional?.outputTokens ?? 0),
                totalTokens: (base?.totalTokens ?? 0) + (additional?.totalTokens ?? 0),
                inputCost: (base?.inputCost ?? 0) + (additional?.inputCost ?? 0),
                outputCost: (base?.outputCost ?? 0) + (additional?.outputCost ?? 0),
                totalCost: (base?.totalCost ?? 0) + (additional?.totalCost ?? 0),
              });

              result.usage = {
                ocr: result.usage?.ocr ?? {},
                extraction: extractionResult.usage,
                ...mergeUsage(result.usage, extractionResult.usage),
              };
            }

            if (result.predictedMarkdown) {
              result.levenshteinDistance = calculateTextSimilarity(
                item.trueMarkdownOutput,
                result.predictedMarkdown,
              );
            }

            if (!isEmpty(result.predictedJson)) {
              const jsonAccuracyResult = calculateJsonAccuracy(
                item.trueJsonOutput,
                result.predictedJson,
              );
              result.jsonAccuracy = jsonAccuracyResult.score;
              result.jsonDiff = jsonAccuracyResult.jsonDiff;
              result.fullJsonDiff = jsonAccuracyResult.fullJsonDiff;
              result.jsonDiffStats = jsonAccuracyResult.jsonDiffStats;
              result.jsonAccuracyResult = jsonAccuracyResult;
            }
          } catch (error) {
            result.error = error;
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
