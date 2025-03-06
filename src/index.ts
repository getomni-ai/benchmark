import dotenv from 'dotenv';
import path from 'path';
import moment from 'moment';
import cliProgress from 'cli-progress';
import { isEmpty } from 'lodash';
import pLimit from 'p-limit';
import yaml from 'js-yaml';
import fs from 'fs';

import { BenchmarkRun } from '@prisma/client';
import { calculateJsonAccuracy, calculateTextSimilarity } from './evaluation';
import { getModelProvider } from './models';
import { Result } from './types';
import {
  createResultFolder,
  loadLocalData,
  writeToFile,
  loadFromDb,
  createBenchmarkRun,
  saveResult,
  completeBenchmarkRun,
} from './utils';

dotenv.config();

/* -------------------------------------------------------------------------- */
/*                                Benchmark Config                            */
/* -------------------------------------------------------------------------- */

const MODEL_CONCURRENCY = {
  'aws-textract': 50,
  'azure-document-intelligence': 50,
  'claude-3-5-sonnet-20241022': 10,
  'gemini-2.0-flash-001': 30,
  'mistral-ocr': 5,
  'gpt-4o': 50,
  omniai: 30,
  zerox: 50,
};

interface ModelConfig {
  ocr: string;
  extraction?: string;
  directImageExtraction?: boolean;
}

// Load models config
const loadModelsConfig = () => {
  try {
    const configPath = path.join(__dirname, 'models.yaml');
    const fileContents = fs.readFileSync(configPath, 'utf8');
    const config = yaml.load(fileContents) as { models: ModelConfig[] };
    return config.models;
  } catch (error) {
    console.error('Error loading models config:', error);
    return [] as ModelConfig[];
  }
};

const MODELS = loadModelsConfig();

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

  // Create benchmark run
  let benchmarkRun: BenchmarkRun;
  if (DATABASE_URL) {
    benchmarkRun = await createBenchmarkRun(timestamp, MODELS, data.length);
  }

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
      [`${model.directImageExtraction ? `${model.extraction} (IMG2JSON)` : `${model.ocr}-${model.extraction}`}`]:
        multibar.create(data.length, 0, {
          model: `${model.directImageExtraction ? `${model.extraction} (IMG2JSON)` : `${model.ocr} -> ${model.extraction}`}`,
        }),
    }),
    {},
  );

  const modelPromises = MODELS.map(
    async ({ ocr: ocrModel, extraction: extractionModel, directImageExtraction }) => {
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
            directImageExtraction,
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
            if (directImageExtraction) {
              const extractionResult = await withTimeout(
                extractionModelProvider.extractFromImage(item.imageUrl, item.jsonSchema),
                `JSON extraction: ${extractionModel}`,
              );
              result.predictedJson = extractionResult.json;
              result.usage = {
                ...extractionResult.usage,
                ocr: undefined,
                extraction: extractionResult.usage,
              };
            } else {
              let ocrResult;
              if (ocrModel === 'ground-truth') {
                result.predictedMarkdown = item.trueMarkdownOutput;
              } else {
                if (ocrModelProvider) {
                  ocrResult = await withTimeout(
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
              }

              let extractionResult;
              if (extractionModelProvider) {
                extractionResult = await withTimeout(
                  extractionModelProvider.extractFromText(
                    result.predictedMarkdown,
                    item.jsonSchema,
                    ocrResult?.imageBase64s,
                  ),
                  `JSON extraction: ${extractionModel}`,
                );
                result.predictedJson = extractionResult.json;

                const mergeUsage = (base: any, additional: any) => ({
                  duration: (base?.duration ?? 0) + (additional?.duration ?? 0),
                  inputTokens: (base?.inputTokens ?? 0) + (additional?.inputTokens ?? 0),
                  outputTokens:
                    (base?.outputTokens ?? 0) + (additional?.outputTokens ?? 0),
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

          if (benchmarkRun) {
            await saveResult(benchmarkRun.id, result);
          }

          // Update progress bar for this model
          progressBars[
            `${directImageExtraction ? `${extractionModel} (IMG2JSON)` : `${ocrModel}-${extractionModel}`}`
          ].increment();
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

  // Complete benchmark run successfully
  if (benchmarkRun) {
    await completeBenchmarkRun(benchmarkRun.id);
  }

  writeToFile(path.join(resultFolder, 'results.json'), results);
};

runBenchmark();
