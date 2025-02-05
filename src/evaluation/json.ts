import { diff } from 'json-diff';

interface DiffStats {
  additions: number;
  deletions: number;
  modifications: number;
  total: number;
}

export interface AccuracyResult {
  score: number;
  fullJsonDiff: Record<string, any>;
  jsonDiff: Record<string, any>;
  jsonDiffStats?: DiffStats;
  totalFields: number;
}

/**
 * Calculates accuracy for JSON structure and primitive values only
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
  const fullDiffResult = diff(actual, predicted, { full: true, sort: true });
  const diffResult = diff(actual, predicted, { sort: true });
  const totalFields = countTotalFields(actual);

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
        total: 0,
      },
      totalFields,
    };
  }

  const changes = countChanges(diffResult);
  const score = Math.max(
    0,
    1 - (changes.additions + changes.deletions + changes.modifications) / totalFields,
  );

  return {
    score: Number(score.toFixed(4)),
    jsonDiff: diffResult,
    fullJsonDiff: fullDiffResult,
    jsonDiffStats: changes,
    totalFields,
  };
};

export const countChanges = (diffResult: any): DiffStats => {
  const changes: DiffStats = {
    additions: 0,
    deletions: 0,
    modifications: 0,
    total: 0,
  };

  const traverse = (obj: any) => {
    if (!obj || typeof obj !== 'object') {
      return;
    }

    for (const key in obj) {
      const value = obj[key];

      if (Array.isArray(value)) {
        // Handle array diffs
        value.forEach(([operation, element]) => {
          if (element === null || typeof element !== 'object') {
            // Handle primitive value changes in arrays
            switch (operation) {
              case '+':
                changes.additions++;
                break;
              case '-':
                changes.deletions++;
                break;
            }
          } else {
            switch (operation) {
              // Handle array element additions and deletions
              case '+':
                changes.additions += countTotalFields(element);
                break;
              case '-':
                changes.deletions += countTotalFields(element);
                break;
              case '~':
                // Handle array element modifications
                traverse(element);
                break;
            }
          }
        });
      } else {
        if (key.endsWith('__deleted')) {
          if (value === null || typeof value !== 'object') {
            changes.deletions++;
          } else {
            changes.deletions += countTotalFields(value);
          }
        } else if (key.endsWith('__added')) {
          if (value === null || typeof value !== 'object') {
            changes.additions++;
          } else {
            changes.additions += countTotalFields(value);
          }
        } else if (typeof value === 'object' && value !== null) {
          if (value.__old !== undefined && value.__new !== undefined) {
            if (value.__old === null && value.__new !== null) {
              changes.modifications += countTotalFields(value.__new) || 1;
            } else {
              changes.modifications += countTotalFields(value.__old) || 1;
            }
          } else {
            traverse(value);
          }
        }
      }
    }
  };

  traverse(diffResult);

  changes.total = changes.additions + changes.deletions + changes.modifications;
  return changes;
};

export function countTotalFields(obj: any): number {
  let count = 0;

  const traverse = (current: any) => {
    if (!current || typeof current !== 'object') {
      return;
    }

    if (Array.isArray(current)) {
      // Traverse into array elements if they're objects
      current.forEach((item) => {
        if (typeof item === 'object' && item !== null) {
          traverse(item);
        } else {
          count++;
        }
      });
    } else {
      for (const key in current) {
        // Skip diff metadata keys
        if (key.includes('__')) {
          continue;
        }

        // Only count primitive value fields
        if (
          current[key] === null ||
          typeof current[key] === 'string' ||
          typeof current[key] === 'number' ||
          typeof current[key] === 'boolean'
        ) {
          count++;
        }
        // Recurse into nested objects and arrays
        else if (typeof current[key] === 'object') {
          traverse(current[key]);
        }
      }
    }
  };

  traverse(obj);
  return count;
}
