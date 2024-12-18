import { diff } from 'json-diff';

interface DiffStats {
  additions: number;
  deletions: number;
  modifications: number;
  total: number;
}

interface AccuracyResult {
  score: number;
  jsonDiff: Record<string, any>;
}

/**
 * Calculates accuracy between predicted and actual JSON objects
 *
 * The accuracy is calculated as:
 * 1 - (number of differences / total fields in actual)
 *
 * Differences include:
 * - Additions: Fields present in predicted but not in actual
 * - Deletions: Fields present in actual but not in predicted
 * - Modifications: Fields present in both but with different values
 *
 * A score of 1.0 means the JSONs are identical
 * A score of 0.0 means completely different
 */
export const calculateJsonAccuracy = (
  predicted: Record<string, any>,
  actual: Record<string, any>,
): AccuracyResult => {
  // Get the diff result
  const diffResult = diff(predicted, actual, { full: true });

  if (!diffResult) {
    // If there's no diff, the JSONs are identical
    return { score: 1, jsonDiff: {} };
  }

  const stats = countDiffChanges(diffResult);

  // Calculate accuracy as: 1 - (number of changes / total fields)
  const totalFields = countTotalFields(actual);
  const accuracy = Math.max(0, 1 - stats.total / totalFields);

  return { score: Number(accuracy.toFixed(4)), jsonDiff: diffResult };
};

const countDiffChanges = (diffResult: any): DiffStats => {
  const stats: DiffStats = {
    additions: 0,
    deletions: 0,
    modifications: 0,
    total: 0,
  };

  const traverseDiff = (obj: any) => {
    for (const key in obj) {
      if (typeof obj[key] === 'object' && obj[key] !== null) {
        traverseDiff(obj[key]);
      } else {
        if (key === '__old') stats.deletions++;
        if (key === '__new') stats.additions++;
        if (key === '__modified') stats.modifications++;
      }
    }
  };

  traverseDiff(diffResult);
  stats.total = stats.additions + stats.deletions + stats.modifications;
  return stats;
};

const countTotalFields = (obj: any): number => {
  let count = 0;

  const traverse = (current: any) => {
    if (Array.isArray(current)) {
      current.forEach((item) => traverse(item));
    } else if (typeof current === 'object' && current !== null) {
      for (const key in current) {
        count++;
        traverse(current[key]);
      }
    } else {
      count++;
    }
  };

  traverse(obj);
  return count;
};
