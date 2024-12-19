import { distance } from 'fastest-levenshtein';

/**
 * Calculates text similarity between original and OCR text using Levenshtein distance
 * Returns a score between 0 and 1, where:
 * 1.0 = texts are identical
 * 0.0 = texts are completely different
 */
export const calculateTextSimilarity = (original: string, predicted: string): number => {
  if (original === predicted) return 1;
  if (!original.length || !predicted.length) return 0;

  // Normalize strings
  const normalizedOriginal = original.trim().toLowerCase();
  const normalizedPredicted = predicted.trim().toLowerCase();

  // Calculate Levenshtein distance
  const levenshteinDistance = distance(normalizedOriginal, normalizedPredicted);

  // Normalize score between 0 and 1
  const maxLength = Math.max(normalizedOriginal.length, normalizedPredicted.length);
  const similarity = 1 - levenshteinDistance / maxLength;

  return Number(similarity.toFixed(4));
};
