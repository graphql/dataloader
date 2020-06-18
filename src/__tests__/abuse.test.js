/**
 * Copyright (c) 2019-present, GraphQL Foundation
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

const DataLoader = require('..');

describe('Provides descriptive error messages for API abuse', () => {

  it('Loader creation requires a function', () => {
    expect(() => {
      // $FlowExpectError
      new DataLoader(); // eslint-disable-line no-new
    }).toThrow(
      'DataLoader must be constructed with a function which accepts ' +
      'Array<key> and returns Promise<Array<value>>, but got: undefined.'
    );

    expect(() => {
      // $FlowExpectError
      new DataLoader({}); // eslint-disable-line no-new
    }).toThrow(
      'DataLoader must be constructed with a function which accepts ' +
      'Array<key> and returns Promise<Array<value>>, but got: [object Object].'
    );
  });

  it('Load function requires an key', async () => {
    const idLoader = new DataLoader<number, number>(async keys => keys);

    await expect(
      // $FlowExpectError
      idLoader.load()
    ).rejects.toThrow(
      'The loader.load() function must be called with a value, ' +
      'but got: undefined.'
    );

    await expect(
      // $FlowExpectError
      idLoader.load(null)
    ).rejects.toThrow(
      'The loader.load() function must be called with a value, ' +
      'but got: null.'
    );

    // Falsey values like the number 0 is acceptable
    await expect(
      idLoader.load(0)
    ).resolves.toEqual(0);
  });

  it('LoadMany function requires a list of key', async () => {
    const idLoader = new DataLoader<number, number>(async keys => keys);

    await expect(
      // $FlowExpectError
      idLoader.loadMany()
    ).rejects.toThrow(
      'The loader.loadMany() function must be called with Array<key> ' +
      'but got: undefined.'
    );

    await expect(
      // $FlowExpectError
      idLoader.loadMany(1, 2, 3)
    ).rejects.toThrow(
      'The loader.loadMany() function must be called with Array<key> ' +
      'but got: 1.'
    );

    // Empty array is acceptable
    await expect(
      idLoader.loadMany([])
    ).resolves.toEqual([]);
  });

  it('Batch function must return a Promise, not null', async () => {
    // $FlowExpectError
    const badLoader = new DataLoader<number, number>(() => null);

    let caughtError;
    try {
      await badLoader.load(1);
    } catch (error) {
      caughtError = error;
    }
    expect(caughtError).toBeInstanceOf(Error);
    expect((caughtError: any).message).toBe(
      'DataLoader must be constructed with a function which accepts ' +
      'Array<key> and returns Promise<Array<value>>, but the function did ' +
      'not return a Promise: null.'
    );
  });

  it('Batch function must return a Promise, not a value', async () => {
    // Note: this is returning the keys directly, rather than a promise to keys.
    // $FlowExpectError
    const badLoader = new DataLoader<number, number>(keys => keys);

    let caughtError;
    try {
      await badLoader.load(1);
    } catch (error) {
      caughtError = error;
    }
    expect(caughtError).toBeInstanceOf(Error);
    expect((caughtError: any).message).toBe(
      'DataLoader must be constructed with a function which accepts ' +
      'Array<key> and returns Promise<Array<value>>, but the function did ' +
      'not return a Promise: 1.'
    );
  });

  it('Batch function must return a Promise of an Array, not null', async () => {
    // Note: this resolves to undefined
    // $FlowExpectError
    const badLoader = new DataLoader<number, number>(async () => null);

    let caughtError;
    try {
      await badLoader.load(1);
    } catch (error) {
      caughtError = error;
    }
    expect(caughtError).toBeInstanceOf(Error);
    expect((caughtError: any).message).toBe(
      'DataLoader must be constructed with a function which accepts ' +
      'Array<key> and returns Promise<Array<value>>, but the function did ' +
      'not return a Promise of an Array: null.'
    );
  });

  it('Batch function must promise an Array of correct length', async () => {
    // Note: this resolves to empty array
    const badLoader = new DataLoader<number, number>(async () => []);

    let caughtError;
    try {
      await badLoader.load(1);
    } catch (error) {
      caughtError = error;
    }
    expect(caughtError).toBeInstanceOf(Error);
    expect((caughtError: any).message).toBe(
      'DataLoader must be constructed with a function which accepts ' +
      'Array<key> and returns Promise<Array<value>>, but the function did ' +
      'not return a Promise of an Array of the same length as the Array ' +
      'of keys.' +
      '\n\nKeys:\n1' +
      '\n\nValues:\n'
    );
  });

  it('Cache should have get, set, delete, and clear methods', async () => {
    class IncompleteMap {
      get() {}
    }

    expect(() => {
      // $FlowExpectError
      const incompleteMap = new IncompleteMap();
      const options = { cacheMap: incompleteMap };
      new DataLoader(async keys => keys, options); // eslint-disable-line no-new
    }).toThrow(
      'Custom cacheMap missing methods: set, delete, clear'
    );
  });

  it('Requires a number for maxBatchSize', () => {
    expect(() =>
      // $FlowExpectError
      new DataLoader(async keys => keys, { maxBatchSize: null })
    ).toThrow('maxBatchSize must be a positive number: null');
  });

  it('Requires a positive number for maxBatchSize', () => {
    expect(() =>
      new DataLoader(async keys => keys, { maxBatchSize: 0 })
    ).toThrow('maxBatchSize must be a positive number: 0');
  });

  it('Requires a function for cacheKeyFn', () => {
    expect(() =>
      // $FlowExpectError
      new DataLoader(async keys => keys, { cacheKeyFn: null })
    ).toThrow('cacheKeyFn must be a function: null');
  });

  it('Requires a function for batchScheduleFn', () => {
    expect(() =>
      // $FlowExpectError
      new DataLoader(async keys => keys, { batchScheduleFn: null })
    ).toThrow('batchScheduleFn must be a function: null');
  });
});
