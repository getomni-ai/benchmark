export interface ArrayAccuracyResult {
  score: number;
  matchedItems: number;
  totalItems: number;
  missingItems: string[];
  extraItems: string[];
}

/**
 * Calculates accuracy between predicted and actual arrays
 *
 * The accuracy is calculated as:
 * number of matching items / max(length of predicted, length of actual)
 *
 * A score of 1.0 means the arrays contain the same items
 * A score of 0.0 means no items match
 */
const calculateArrayAccuracy = (
  predicted: any[],
  actual: any[],
  options: {
    caseSensitive?: boolean;
    trimWhitespace?: boolean;
  } = {
    caseSensitive: true,
    trimWhitespace: true,
  },
): ArrayAccuracyResult => {
  if (!Array.isArray(predicted) || !Array.isArray(actual)) {
    throw new Error('Both inputs must be arrays');
  }

  // Normalize arrays based on options
  const normalizeItem = (item: any): string => {
    const str = String(item);
    return options.caseSensitive
      ? options.trimWhitespace
        ? str.trim()
        : str
      : (options.trimWhitespace ? str.trim() : str).toLowerCase();
  };

  const normalizedPredicted = predicted.map(normalizeItem);
  const normalizedActual = actual.map(normalizeItem);

  // Find matching items
  const matchedItems = normalizedPredicted.filter((item) =>
    normalizedActual.includes(item),
  ).length;

  // Find missing and extra items
  const missingItems = actual.filter(
    (item) => !normalizedPredicted.includes(normalizeItem(item)),
  );
  const extraItems = predicted.filter(
    (item) => !normalizedActual.includes(normalizeItem(item)),
  );

  // Calculate accuracy score
  const totalItems = Math.max(predicted.length, actual.length);
  const score = totalItems === 0 ? 1 : matchedItems / totalItems;

  return {
    score: Number(score.toFixed(4)),
    matchedItems,
    totalItems,
    missingItems,
    extraItems,
  };
};

/**
 * Finds all array properties in a JSON schema
 * Returns an array of paths to array properties (e.g. ['line_items', 'results_summary'])
 */
const findArrayProperties = (schema: any, path: string[] = []): string[] => {
  if (!schema || typeof schema !== 'object') {
    return [];
  }

  let arrayProps: string[] = [];

  // Check if current property is an array
  if (schema.type === 'array') {
    arrayProps.push(path.join('.'));
  }

  // If it's an object with properties, recurse through them
  if (schema.properties) {
    Object.entries(schema.properties).forEach(([key, value]) => {
      const newPath = [...path, key];
      arrayProps = [...arrayProps, ...findArrayProperties(value, newPath)];
    });
  }

  return arrayProps;
};

/**
 * Extracts array values from an object given a path
 */
const getArrayByPath = (obj: any, path: string): any[] | undefined => {
  const parts = path.split('.');
  let current = obj;

  for (const part of parts) {
    if (current && typeof current === 'object') {
      current = current[part];
    } else {
      return undefined;
    }
  }

  return Array.isArray(current) ? current : undefined;
};

/**
 * Calculates array accuracies for all array properties in a JSON schema
 */
export const calculateJsonArrayAccuracies = (
  predicted: any,
  actual: any,
  schema: any,
): Record<string, ArrayAccuracyResult> => {
  const arrayPaths = findArrayProperties(schema);
  const results: Record<string, ArrayAccuracyResult> = {};

  for (const path of arrayPaths) {
    const predictedArray = getArrayByPath(predicted, path);
    const actualArray = getArrayByPath(actual, path);

    if (predictedArray && actualArray) {
      results[path] = calculateArrayAccuracy(predictedArray, actualArray, {
        caseSensitive: false,
        trimWhitespace: true,
      });
    }
  }

  return results;
};
