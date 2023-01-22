/**
 * Copyright (c) 2019-present, GraphQL Foundation
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

// Mock out process.nextTick as not existing for this test before requiring.
process.nextTick = (null: any);
const DataLoader = require('..');

describe('Browser support', () => {
  it('batches multiple requests without process.nextTick', async () => {
    const loadCalls = [];
    const identityLoader = new DataLoader<number, number>(async keys => {
      loadCalls.push(keys);
      return keys;
    });

    const promise1 = identityLoader.load(1);
    const promise2 = identityLoader.load(2);

    const [value1, value2] = await Promise.all([promise1, promise2]);
    expect(value1).toBe(1);
    expect(value2).toBe(2);

    expect(loadCalls).toEqual([[1, 2]]);
  });
});
