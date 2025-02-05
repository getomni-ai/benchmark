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

  it('should calculate json accuracy with nested arrays', () => {
    const actual = { a: 1, b: [{ c: 2, d: 4, e: 4, f: [2, 9] }] };
    const predicted = { a: 1, b: [{ c: 2, d: 4, e: 5, f: [2, 3] }] };
    const result = calculateJsonAccuracy(actual, predicted);
    expect(result.score).toBe(0.5);
  });

  it('array of objects with different order should be considered a match', () => {
    const actual = {
      a: 1,
      b: [
        { c: 1, d: 2 },
        { c: 3, d: 4 },
      ],
    };
    const predicted = {
      a: 1,
      b: [
        { c: 3, d: 4 },
        { c: 1, d: 2 },
      ],
    };
    const result = calculateJsonAccuracy(actual, predicted);
    expect(result.score).toBe(1);
  });

  it('when an entire array is null in the predicted json, the number of unmatched items should be the length of the array', () => {
    const actual = { a: 1, b: [1, 2, 3] };
    const predicted = { a: 1, b: null };
    const result = calculateJsonAccuracy(actual, predicted);
    expect(result.score).toBe(1 / 4);
  });

  it('when an entire array is null in the predicted json, the number of unmatched items should be the length of the array', () => {
    const actual = { a: 1, b: [{ c: 1, d: 1 }, { c: 2 }, { c: 3, e: 4 }] };
    const predicted = { a: 1, b: null };
    const result = calculateJsonAccuracy(actual, predicted);
    expect(result.score).toBe(Number((1 / 6).toFixed(4)));
  });

  it('missing object fields should be considered a match', () => {
    const actual = { a: 1, b: { c: 1, d: { e: 1, f: 2 } } };
    const predicted = { a: 1, b: { c: 1, d: null } };
    const result = calculateJsonAccuracy(actual, predicted);
    expect(result.score).toBe(0.5);
  });

  it('__old == null & __new == smth', () => {
    const actual = { a: [{ b: 1, c: null }] };
    const predicted = { a: [{ b: 1, c: 2 }] };
    const result = calculateJsonAccuracy(actual, predicted);
    expect(result.score).toBe(0.5);
  });

  it('__old == null & __new == smth & __new is an object', () => {
    const actual = { a: [{ b: 1, c: null, f: 4 }] };
    const predicted = { a: [{ b: 1, c: { d: 2 }, f: 4 }] };
    const result = calculateJsonAccuracy(actual, predicted);
    expect(result.score).toBe(0.6667);
  });

  it('__old == null & __new == smth & __new is an object 2', () => {
    const actual = { a: [{ b: 1, c: null, f: 4 }] };
    const predicted = { a: [{ b: 1, c: { d: 2, e: 3 }, f: 4 }] };
    const result = calculateJsonAccuracy(actual, predicted);
    expect(result.score).toBe(0.3333);
  });

  it('__old == null & __new == smth & __new is an array', () => {
    const actual = { a: [{ b: 1, c: null, f: 4 }] };
    const predicted = { a: [{ b: 1, c: [3], f: 4 }] };
    const result = calculateJsonAccuracy(actual, predicted);
    expect(result.score).toBe(0.6667);
  });

  it('__old == smth & __new == null', () => {
    const actual = { a: [{ b: 1, c: 2 }] };
    const predicted = { a: [{ b: 1, c: null }] };
    const result = calculateJsonAccuracy(actual, predicted);
    expect(result.score).toBe(0.5);
  });

  it('__old == smth & __new == null & __new is an object', () => {
    const actual = { a: [{ b: 1, c: { d: 2 } }] };
    const predicted = { a: [{ b: 1, c: null }] };
    const result = calculateJsonAccuracy(actual, predicted);
    expect(result.score).toBe(0.5);
  });

  it('__old == smth & __new == null & __new is an object 2', () => {
    const actual = { a: [{ b: 1, c: { d: 2, e: 3 } }] };
    const predicted = { a: [{ b: 1, c: null }] };
    const result = calculateJsonAccuracy(actual, predicted);
    expect(result.score).toBe(0.3333);
  });

  it('__old == smth & __new == null & __new is an array', () => {
    const actual = { a: [{ b: 1, c: [3, 2] }] };
    const predicted = { a: [{ b: 1, c: null }] };
    const result = calculateJsonAccuracy(actual, predicted);
    expect(result.score).toBe(0.3333);
  });
});
