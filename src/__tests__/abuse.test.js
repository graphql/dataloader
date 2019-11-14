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

  it('Load function requires an key', () => {
    const idLoader = new DataLoader(keys => Promise.resolve(keys));

    expect(() => {
      idLoader.load();
    }).toThrow(
      'The loader.load() function must be called with a value,' +
      'but got: undefined.'
    );

    expect(() => {
      idLoader.load(null);
    }).toThrow(
      'The loader.load() function must be called with a value,' +
      'but got: null.'
    );

    // Falsey values like the number 0 is acceptable
    expect(() => {
      idLoader.load(0);
    }).not.toThrow();
  });

  it('LoadMany function requires a list of key', () => {
    const idLoader = new DataLoader(keys => Promise.resolve(keys));

    expect(() => {
      // $FlowExpectError
      idLoader.loadMany();
    }).toThrow(
      'The loader.loadMany() function must be called with Array<key> ' +
      'but got: undefined.'
    );

    expect(() => {
      // $FlowExpectError
      idLoader.loadMany(1, 2, 3);
    }).toThrow(
      'The loader.loadMany() function must be called with Array<key> ' +
      'but got: 1.'
    );

    // Empty array is acceptable
    expect(() => {
      idLoader.loadMany([]);
    }).not.toThrow();
  });

  it('Batch function must return a Promise, not null', async () => {
    // $FlowExpectError
    const badLoader = new DataLoader(() => null);

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
    const badLoader = new DataLoader(keys => keys);

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
    const badLoader = new DataLoader(() => Promise.resolve(undefined));

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
      'not return a Promise of an Array: undefined.'
    );
  });

  it('Batch function must promise an Array of correct length', async () => {
    // Note: this resolves to empty array
    const badLoader = new DataLoader(() => Promise.resolve([]));

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
});
