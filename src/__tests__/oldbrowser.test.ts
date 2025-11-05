/**
 * Copyright (c) 2019-present, GraphQL Foundation
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import DataLoader from '../index.ts';
import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';

describe('Old browser support', () => {
  const originalSetImmediate = global.setImmediate;
  const originalProcess = global.process;

  beforeEach(() => {
    // @ts-expect-error testing an old browser environment by removing setImmediate
    global.setImmediate = undefined;
    // @ts-expect-error testing an old browser environment by removing process.nextTick
    global.process = { nextTick: undefined };
  });

  afterEach(() => {
    global.setImmediate = originalSetImmediate;
    global.process = originalProcess;
  });

  it('batches multiple requests without setImmediate', async () => {
    const loadCalls: ReadonlyArray<number>[] = [];
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
