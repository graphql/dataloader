/* @no-flow */
/**
 *  Copyright (c) 2015, Facebook, Inc.
 *  All rights reserved.
 *
 *  This source code is licensed under the BSD-style license found in the
 *  LICENSE file in the root directory of this source tree. An additional grant
 *  of patent rights can be found in the PATENTS file in the same directory.
 */

const { expect } = require('chai');
const { describe, it } = require('mocha');
const DataLoader = require('../');

describe('Provides descriptive error messages for API abuse', () => {

  it('Loader creation requires a function', () => {
    expect(() => {
      new DataLoader(); // eslint-disable-line no-new
    }).to.throw(
      'DataLoader must be constructed with a function which accepts ' +
      'Array<key> and returns Promise<Array<value>>, but got: undefined.'
    );

    expect(() => {
      new DataLoader({}); // eslint-disable-line no-new
    }).to.throw(
      'DataLoader must be constructed with a function which accepts ' +
      'Array<key> and returns Promise<Array<value>>, but got: [object Object].'
    );
  });

  it('Load function requires an key', () => {
    var idLoader = new DataLoader(keys => Promise.resolve(keys));

    expect(() => {
      idLoader.load();
    }).to.throw(
      'The loader.load() function must be called with a value,' +
      'but got: undefined.'
    );

    expect(() => {
      idLoader.load(null);
    }).to.throw(
      'The loader.load() function must be called with a value,' +
      'but got: null.'
    );

    // Falsey values like the number 0 is acceptable
    expect(() => {
      idLoader.load(0);
    }).not.to.throw();
  });

  it('LoadMany function requires a list of key', () => {
    var idLoader = new DataLoader(keys => Promise.resolve(keys));

    expect(() => {
      idLoader.loadMany();
    }).to.throw(
      'The loader.loadMany() function must be called with Array<key> ' +
      'but got: undefined.'
    );

    expect(() => {
      idLoader.loadMany(1, 2, 3);
    }).to.throw(
      'The loader.loadMany() function must be called with Array<key> ' +
      'but got: 1.'
    );

    // Empty array is acceptable
    expect(() => {
      idLoader.loadMany([]);
    }).not.to.throw();
  });

  it('Batch function must return a Promise, not null', async () => {
    var badLoader = new DataLoader(() => null);

    var caughtError;
    try {
      await badLoader.load(1);
    } catch (error) {
      caughtError = error;
    }
    expect(caughtError).to.be.instanceof(Error);
    expect(caughtError.message).to.equal(
      'DataLoader must be constructed with a function which accepts ' +
      'Array<key> and returns Promise<Array<value>>, but the function did ' +
      'not return a Promise: null.'
    );
  });

  it('Batch function must return a Promise, not a value', async () => {
    // Note: this is returning the keys directly, rather than a promise to keys.
    var badLoader = new DataLoader(keys => keys);

    var caughtError;
    try {
      await badLoader.load(1);
    } catch (error) {
      caughtError = error;
    }
    expect(caughtError).to.be.instanceof(Error);
    expect(caughtError.message).to.equal(
      'DataLoader must be constructed with a function which accepts ' +
      'Array<key> and returns Promise<Array<value>>, but the function did ' +
      'not return a Promise: 1.'
    );
  });

  it('Batch function must return a Promise of an Array, not null', async () => {
    // Note: this resolves to undefined
    var badLoader = new DataLoader(() => Promise.resolve());

    var caughtError;
    try {
      await badLoader.load(1);
    } catch (error) {
      caughtError = error;
    }
    expect(caughtError).to.be.instanceof(Error);
    expect(caughtError.message).to.equal(
      'DataLoader must be constructed with a function which accepts ' +
      'Array<key> and returns Promise<Array<value>>, but the function did ' +
      'not return a Promise of an Array: undefined.'
    );
  });

  it('Batch function must promise an Array of correct length', async () => {
    // Note: this resolves to empty array
    var badLoader = new DataLoader(() => Promise.resolve([]));

    var caughtError;
    try {
      await badLoader.load(1);
    } catch (error) {
      caughtError = error;
    }
    expect(caughtError).to.be.instanceof(Error);
    expect(caughtError.message).to.equal(
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
      var incompleteMap = new IncompleteMap();
      var options = { cacheMap: incompleteMap };
      new DataLoader(keys => keys, options); // eslint-disable-line no-new
    }).to.throw(
      'Custom cacheMap missing methods: set, delete, clear'
    );
  });
});
