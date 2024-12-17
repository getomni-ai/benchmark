import { diff } from 'json-diff';

interface DiffStats {
  additions: number;
  deletions: number;
  modifications: number;
  total: number;
}

export const calculateJsonAccuracy = (
  predicted: Record<string, any>,
  actual: Record<string, any>,
): number => {
  // Get the diff result
  const diffResult = diff(predicted, actual, { full: true });

  if (!diffResult) {
    // If there's no diff, the JSONs are identical
    return 1;
  }

  const stats = countDiffChanges(diffResult);

  // Calculate accuracy as: 1 - (number of changes / total fields)
  const totalFields = countTotalFields(actual);
  const accuracy = Math.max(0, 1 - stats.total / totalFields);

  return Number(accuracy.toFixed(4));
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
