import {
  calculateJsonAccuracy,
  countTotalFields,
  countChanges,
} from '../../src/evaluation/json';

describe('countTotalFields', () => {
  it('should count total fields in a nested object', () => {
    const obj = { a: 1, b: { c: 2, d: [3, { e: 4 }] } };
    expect(countTotalFields(obj)).toBe(4);
  });

  it('should handle arrays of primitive values', () => {
    const obj = { a: [1, 2, 3], b: 'test', c: true };
    expect(countTotalFields(obj)).toBe(5);
  });

  it('should handle arrays of objects', () => {
    const obj = { a: [{ b: 1 }, { c: 2 }], d: 'test', e: true };
    expect(countTotalFields(obj)).toBe(4);
  });

  it('should handle null values', () => {
    const obj = { a: null, b: { c: null }, d: 'test' };
    expect(countTotalFields(obj)).toBe(3);
  });

  it('should ignore fields with __diff metadata', () => {
    const obj = {
      a: 1,
      b__deleted: true,
      c__added: 'test',
      d: { e: 2 },
    };
    expect(countTotalFields(obj)).toBe(2);
  });
});

describe('calculateJsonAccuracy', () => {
  it('should calculate json accuracy', () => {
    const actual = { a: 1, b: 2 };
    const predicted = { a: 1, b: 3 };
    const result = calculateJsonAccuracy(actual, predicted);
    expect(result.score).toBe(0.5);
  });

  it('should calculate json accuracy with nested objects', () => {
    const actual = { a: 1, b: { c: 2, d: 4, e: 4 } };
    const predicted = { a: 1, b: { c: 2, d: 4, e: 5 } };
    const result = calculateJsonAccuracy(actual, predicted);
    expect(result.score).toBe(0.75);
  });
});
