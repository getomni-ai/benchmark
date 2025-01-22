import { diff } from 'json-diff';

interface DiffStats {
  additions: number;
  deletions: number;
  modifications: number;
  total: number;
}

interface AccuracyResult {
  score: number;
  fullJsonDiff: Record<string, any>;
  jsonDiff: Record<string, any>;
  jsonDiffStats?: DiffStats;
}

/**
 * Calculates accuracy for JSON structure and primitive values only (excluding arrays)
 * Arrays are handled separately by array accuracy calculation
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
  actual: Record<string, any>,
  predicted: Record<string, any>,
): AccuracyResult => {
  // Get the diff result
  const fullDiffResult = diff(actual, predicted, { full: true });
  const diffResult = diff(actual, predicted);

  if (!diffResult) {
    // If there's no diff, the JSONs are identical
    return {
      score: 1,
      jsonDiff: {},
      fullJsonDiff: {},
      jsonDiffStats: {
        additions: 0,
        deletions: 0,
        modifications: 0,
        total: countTotalFields(actual),
      },
    };
  }

  const details = countStructuralChanges(diffResult);
  const score = Math.max(
    0,
    1 - (details.additions + details.deletions + details.modifications) / details.total,
  );

  return {
    score: Number(score.toFixed(4)),
    jsonDiff: diffResult,
    fullJsonDiff: fullDiffResult,
    jsonDiffStats: details,
  };
};

const countStructuralChanges = (diffResult: any): DiffStats => {
  const details: DiffStats = {
    additions: 0,
    deletions: 0,
    modifications: 0,
    total: 0,
  };

  const traverse = (obj: any) => {
    for (const key in obj) {
      // Skip array diffs - they're handled by array accuracy
      if (Array.isArray(obj[key])) {
        continue;
      }

      if (key.endsWith('__deleted')) {
        details.deletions++;
      } else if (key.endsWith('__added')) {
        details.additions++;
      } else if (typeof obj[key] === 'object' && obj[key] !== null) {
        if (obj[key].__old !== undefined && obj[key].__new !== undefined) {
          details.modifications++;
        } else {
          traverse(obj[key]);
        }
      }
    }
  };

  traverse(diffResult);
  details.total = countTotalFields(diffResult);
  return details;
};

export function countTotalFields(obj: any): number {
  let count = 0;

  const traverse = (current: any) => {
    if (!current || typeof current !== 'object') {
      return;
    }

    // Skip arrays - they're handled by array accuracy
    if (Array.isArray(current)) {
      return;
    }

    for (const key in current) {
      // Don't count diff metadata keys
      if (
        key.endsWith('__deleted') ||
        key.endsWith('__added') ||
        key === '__old' ||
        key === '__new'
      ) {
        continue;
      }
      count++;
      traverse(current[key]);
    }
  };

  traverse(obj);
  return count;
}
