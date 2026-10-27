/**
 * Copyright (c) 2019-present, GraphQL Foundation
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

const DataLoader = require('..');

function createScheduler() {
  const callbacks: Array<() => void> = [];
  return {
    schedule(callback) {
      callbacks.push(callback);
    },
    dispatch() {
      callbacks.splice(0).forEach(callback => callback());
    },
  };
}

describe('Cache ownership after batch failure', () => {
  for (const batch of [true, false]) {
    for (const normalize of [true, false]) {
      for (const replacement of ['pending', 'completed', 'primed']) {
        it(`preserves ${replacement} replacement (batch=${String(
          batch,
        )}, normalize=${String(normalize)})`, async () => {
          const { schedule, dispatch } = createScheduler();
          const calls = [];
          const error = new Error('old batch failed');
          let rejectOld = () => {};
          const firstBatch = new Promise((resolve, reject) => {
            rejectOld = () => reject(error);
          });
          let finishNew = () => {};
          const nextBatch = new Promise(resolve => {
            finishNew = () => resolve(['fresh']);
          });
          const cache = new Map<string, Promise<string>>();
          const loader = new DataLoader<string, string>(
            keys => {
              calls.push(keys);
              return calls.length === 1 ? firstBatch : nextBatch;
            },
            {
              batch,
              batchScheduleFn: schedule,
              cacheKeyFn: key => (normalize ? key.toLowerCase() : key),
              cacheMap: {
                get: key => cache.get(key),
                set: (key, value) => cache.set(key, value),
                delete: key => cache.delete(key),
                clear: () => cache.clear(),
              },
            },
          );
          const old = loader.load('A').catch(caught => caught);
          dispatch();
          const key = normalize ? 'a' : 'A';
          loader.clear(key);
          if (replacement === 'primed') {
            loader.prime(key, 'primed');
          }
          const fresh = loader.load(key);
          dispatch();
          if (replacement === 'completed') {
            finishNew();
            expect(await fresh).toBe('fresh');
          }

          rejectOld();
          expect(await old).toBe(error);
          const observed = loader.load(key);
          dispatch();
          finishNew();
          const expected = replacement === 'primed' ? 'primed' : 'fresh';
          expect(await Promise.all([fresh, observed])).toEqual([
            expected,
            expected,
          ]);
          expect(calls).toHaveLength(replacement === 'primed' ? 1 : 2);
        });
      }
    }
  }

  it('evicts the failed request when it still owns the cache entry', async () => {
    const { schedule, dispatch } = createScheduler();
    const calls = [];
    const error = new Error('batch failed');
    const loader = new DataLoader<string, string>(
      keys => {
        calls.push(keys);
        return calls.length === 1
          ? Promise.reject(error)
          : Promise.resolve(keys);
      },
      { batchScheduleFn: schedule, cacheKeyFn: key => key.toLowerCase() },
    );
    const old = loader.load('A').catch(caught => caught);
    dispatch();
    expect(await old).toBe(error);
    const retry = loader.load('a');
    dispatch();
    expect(await retry).toBe('a');
    expect(calls).toEqual([['A'], ['a']]);
  });

  for (const maxBatchSize of [1, 2]) {
    it(`handles duplicate keys with maxBatchSize=${maxBatchSize}`, async () => {
      const { schedule, dispatch } = createScheduler();
      const calls = [];
      const error = new Error('batch failed');
      const loader = new DataLoader<string, string>(
        keys => {
          calls.push(keys);
          return calls.length === 1
            ? Promise.reject(error)
            : Promise.resolve(keys);
        },
        { batchScheduleFn: schedule, maxBatchSize },
      );
      const old = loader.load('A').catch(caught => caught);
      loader.clear('A');
      const fresh = loader.load('A').catch(caught => caught);
      dispatch();
      expect(await old).toBe(error);
      expect(await fresh).toBe(maxBatchSize === 1 ? 'A' : error);
      const observed = loader.load('A');
      dispatch();
      expect(await observed).toBe('A');
      expect(calls).toHaveLength(2);
    });
  }

  it('does not consult cache keys or maps when caching is disabled', async () => {
    const { schedule, dispatch } = createScheduler();
    const error = new Error('batch failed');
    const cacheKeyFn = jest.fn(key => key);
    const cacheMap = {
      get: jest.fn(),
      set: jest.fn(),
      delete: jest.fn(),
      clear: jest.fn(),
    };
    const loader = new DataLoader<string, string>(() => Promise.reject(error), {
      cache: false,
      cacheKeyFn,
      cacheMap,
      batchScheduleFn: schedule,
    });
    const old = loader.load('A').catch(caught => caught);
    dispatch();
    expect(await old).toBe(error);
    expect(cacheKeyFn).not.toHaveBeenCalled();
    expect(cacheMap.get).not.toHaveBeenCalled();
    expect(cacheMap.delete).not.toHaveBeenCalled();
  });

  it('preserves a replacement made before a synchronous batch exception', async () => {
    const { schedule, dispatch } = createScheduler();
    const loader = new DataLoader<string, string>(
      () => {
        loader.clear('A').prime('A', 'primed');
        throw new Error('synchronous failure');
      },
      { batchScheduleFn: schedule },
    );
    const old = loader.load('A').catch(caught => caught.message);
    dispatch();
    expect(await old).toContain('synchronous failure');
    const observed = loader.load('A');
    dispatch();
    expect(await observed).toBe('primed');
  });
});
