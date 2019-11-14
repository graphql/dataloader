/**
 * Copyright (c) 2019-present, GraphQL Foundation
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

// A Function, which when given an Array of keys, returns a Promise of an Array
// of values or Errors.
export type BatchLoadFn<K, V> =
  (keys: $ReadOnlyArray<K>) => Promise<$ReadOnlyArray<V | Error>>;

// Optionally turn off batching or caching or provide a cache key function or a
// custom cache instance.
export type Options<K, V, C = K> = {
  batch?: boolean;
  maxBatchSize?: number;
  cache?: boolean;
  cacheKeyFn?: (key: K) => C;
  cacheMap?: CacheMap<C, Promise<V>>;
};

// If a custom cache is provided, it must be of this type (a subset of ES6 Map).
export type CacheMap<K, V> = {
  get(key: K): V | void;
  set(key: K, value: V): any;
  delete(key: K): any;
  clear(): any;
};

/**
 * A `DataLoader` creates a public API for loading data from a particular
 * data back-end with unique keys such as the `id` column of a SQL table or
 * document name in a MongoDB database, given a batch loading function.
 *
 * Each `DataLoader` instance contains a unique memoized cache. Use caution when
 * used in long-lived applications or those which serve many users with
 * different access permissions and consider creating a new instance per
 * web request.
 */
class DataLoader<K, V, C = K> {
  constructor(
    batchLoadFn: BatchLoadFn<K, V>,
    options?: Options<K, V, C>
  ) {
    if (typeof batchLoadFn !== 'function') {
      throw new TypeError(
        'DataLoader must be constructed with a function which accepts ' +
        `Array<key> and returns Promise<Array<value>>, but got: ${batchLoadFn}.`
      );
    }
    this._batchLoadFn = batchLoadFn;
    this._options = options;
    this._promiseCache = getValidCacheMap(options);
    this._batch = null;
  }

  // Private
  _batchLoadFn: BatchLoadFn<K, V>;
  _options: ?Options<K, V, C>;
  _promiseCache: ?CacheMap<C, Promise<V>>;
  _batch: Batch<K, V> | null;

  /**
   * Loads a key, returning a `Promise` for the value represented by that key.
   */
  load(key: K): Promise<V> {
    if (key === null || key === undefined) {
      throw new TypeError(
        'The loader.load() function must be called with a value,' +
        `but got: ${String(key)}.`
      );
    }

    // Determine options
    var options = this._options;
    var batch = getCurrentBatch(this);
    var cache = this._promiseCache;
    var cacheKey = getCacheKey(options, key);

    // If caching and there is a cache-hit, return cached Promise.
    if (cache) {
      var cachedPromise = cache.get(cacheKey);
      if (cachedPromise) {
        return cachedPromise;
      }
    }

    // Otherwise, produce a new Promise for this key, and enqueue it to be
    // dispatched along with the current batch.
    batch.keys.push(key);
    var promise = new Promise((resolve, reject) => {
      batch.callbacks.push({ resolve, reject });
    });

    // If caching, cache this promise.
    if (cache) {
      cache.set(cacheKey, promise);
    }

    return promise;
  }

  /**
   * Loads multiple keys, promising an array of values:
   *
   *     var [ a, b ] = await myLoader.loadMany([ 'a', 'b' ]);
   *
   * This is equivalent to the more verbose:
   *
   *     var [ a, b ] = await Promise.all([
   *       myLoader.load('a'),
   *       myLoader.load('b')
   *     ]);
   *
   */
  loadMany(keys: $ReadOnlyArray<K>): Promise<Array<V>> {
    if (!isArrayLike(keys)) {
      throw new TypeError(
        'The loader.loadMany() function must be called with Array<key> ' +
        `but got: ${(keys: any)}.`
      );
    }
    // Support ArrayLike by using only minimal property access
    const loadPromises = [];
    for (let i = 0; i < keys.length; i++) {
      loadPromises.push(this.load(keys[i]));
    }
    return Promise.all(loadPromises);
  }

  /**
   * Clears the value at `key` from the cache, if it exists. Returns itself for
   * method chaining.
   */
  clear(key: K): this {
    var cache = this._promiseCache;
    if (cache) {
      var cacheKey = getCacheKey(this._options, key);
      cache.delete(cacheKey);
    }
    return this;
  }

  /**
   * Clears the entire cache. To be used when some event results in unknown
   * invalidations across this particular `DataLoader`. Returns itself for
   * method chaining.
   */
  clearAll(): this {
    var cache = this._promiseCache;
    if (cache) {
      cache.clear();
    }
    return this;
  }

  /**
   * Adds the provided key and value to the cache. If the key already
   * exists, no change is made. Returns itself for method chaining.
   *
   * To prime the cache with an error at a key, provide an Error instance.
   */
  prime(key: K, value: V | Error): this {
    var cache = this._promiseCache;
    if (cache) {
      var cacheKey = getCacheKey(this._options, key);

      // Only add the key if it does not already exist.
      if (cache.get(cacheKey) === undefined) {
        // Cache a rejected promise if the value is an Error, in order to match
        // the behavior of load(key).
        var promise;
        if (value instanceof Error) {
          promise = Promise.reject(value);
          // Since this is a case where an Error is intentionally being primed
          // for a given key, we want to disable unhandled promise rejection.
          promise.catch(() => {});
        } else {
          promise = Promise.resolve(value);
        }
        cache.set(cacheKey, promise);
      }
    }
    return this;
  }
}

// Private: Enqueue a Job to be executed after all "PromiseJobs" Jobs.
//
// ES6 JavaScript uses the concepts Job and JobQueue to schedule work to occur
// after the current execution context has completed:
// http://www.ecma-international.org/ecma-262/6.0/#sec-jobs-and-job-queues
//
// Node.js uses the `process.nextTick` mechanism to implement the concept of a
// Job, maintaining a global FIFO JobQueue for all Jobs, which is flushed after
// the current call stack ends.
//
// When calling `then` on a Promise, it enqueues a Job on a specific
// "PromiseJobs" JobQueue which is flushed in Node as a single Job on the
// global JobQueue.
//
// DataLoader batches all loads which occur in a single frame of execution, but
// should include in the batch all loads which occur during the flushing of the
// "PromiseJobs" JobQueue after that same execution frame.
//
// In order to avoid the DataLoader dispatch Job occuring before "PromiseJobs",
// A Promise Job is created with the sole purpose of enqueuing a global Job,
// ensuring that it always occurs after "PromiseJobs" ends.
//
// Node.js's job queue is unique. Browsers do not have an equivalent mechanism
// for enqueuing a job to be performed after promise microtasks and before the
// next macrotask. For browser environments, a macrotask is used (via
// setImmediate or setTimeout) at a potential performance penalty.
var enqueuePostPromiseJob =
  typeof process === 'object' && typeof process.nextTick === 'function' ?
    function (fn) {
      if (!resolvedPromise) {
        resolvedPromise = Promise.resolve();
      }
      resolvedPromise.then(() => process.nextTick(fn));
    } :
    setImmediate || setTimeout;

// Private: cached resolved Promise instance
var resolvedPromise;

// Private: Describes a batch of requests
type Batch<K, V> = {
  hasDispatched: boolean,
  keys: Array<K>,
  callbacks: Array<{
    resolve: (value: V) => void;
    reject: (error: Error) => void;
  }>
}

// Private: Either returns the current batch, or creates and schedules a
// dispatch of a new batch for the given loader.
function getCurrentBatch<K, V>(loader: DataLoader<K, V, any>): Batch<K, V> {
  var options = loader._options;
  var maxBatchSize =
    (options && options.maxBatchSize) ||
    (options && options.batch === false ? 1 : 0);

  // If there is an existing batch which has not yet dispatched and is within
  // the limit of the batch size, then return it.
  var existingBatch = loader._batch;
  if (
    existingBatch !== null &&
    !existingBatch.hasDispatched &&
    (maxBatchSize === 0 || existingBatch.keys.length < maxBatchSize)
  ) {
    return existingBatch;
  }

  // Otherwise, create a new batch for this loader.
  var newBatch = { hasDispatched: false, keys: [], callbacks: [] };

  // Store it on the loader so it may be reused.
  loader._batch = newBatch;

  // Then schedule a task to dispatch this batch of requests.
  enqueuePostPromiseJob(() => dispatchBatch(loader, newBatch));

  return newBatch;
}

function dispatchBatch<K, V>(
  loader: DataLoader<K, V, any>,
  batch: Batch<K, V>
) {
  // Mark this batch as having been dispatched.
  batch.hasDispatched = true;

  // Call the provided batchLoadFn for this loader with the batch's keys and
  // with the loader as the `this` context.
  var batchPromise = loader._batchLoadFn(batch.keys);

  // Assert the expected response from batchLoadFn
  if (!batchPromise || typeof batchPromise.then !== 'function') {
    return failedDispatch(loader, batch, new TypeError(
      'DataLoader must be constructed with a function which accepts ' +
      'Array<key> and returns Promise<Array<value>>, but the function did ' +
      `not return a Promise: ${String(batchPromise)}.`
    ));
  }

  // Await the resolution of the call to batchLoadFn.
  batchPromise.then(values => {

    // Assert the expected resolution from batchLoadFn.
    if (!isArrayLike(values)) {
      throw new TypeError(
        'DataLoader must be constructed with a function which accepts ' +
        'Array<key> and returns Promise<Array<value>>, but the function did ' +
        `not return a Promise of an Array: ${String(values)}.`
      );
    }
    if (values.length !== batch.keys.length) {
      throw new TypeError(
        'DataLoader must be constructed with a function which accepts ' +
        'Array<key> and returns Promise<Array<value>>, but the function did ' +
        'not return a Promise of an Array of the same length as the Array ' +
        'of keys.' +
        `\n\nKeys:\n${String(batch.keys)}` +
        `\n\nValues:\n${String(values)}`
      );
    }

    // Step through values, resolving or rejecting each Promise in the batch.
    for (var i = 0; i < batch.callbacks.length; i++) {
      var value = values[i];
      if (value instanceof Error) {
        batch.callbacks[i].reject(value);
      } else {
        batch.callbacks[i].resolve(value);
      }
    }
  }).catch(error => failedDispatch(loader, batch, error));
}

// Private: do not cache individual loads if the entire batch dispatch fails,
// but still reject each request so they do not hang.
function failedDispatch<K, V>(
  loader: DataLoader<K, V, any>,
  batch: Batch<K, V>,
  error: Error
) {
  for (var i = 0; i < batch.keys.length; i++) {
    loader.clear(batch.keys[i]);
    batch.callbacks[i].reject(error);
  }
}

// Private: produce a cache key for a given key (and options)
function getCacheKey<K, V, C>(
  options: ?Options<K, V, C>,
  key: K
): C {
  var cacheKeyFn = options && options.cacheKeyFn;
  return cacheKeyFn ? cacheKeyFn(key) : (key: any);
}

// Private: given the DataLoader's options, produce a CacheMap to be used.
function getValidCacheMap<K, V, C>(
  options: ?Options<K, V, C>
): ?CacheMap<C, Promise<V>> {
  var shouldCache = !options || options.cache !== false;
  if (!shouldCache) {
    return null;
  }
  var cacheMap = options && options.cacheMap;
  if (!cacheMap) {
    return new Map();
  }
  var cacheFunctions = [ 'get', 'set', 'delete', 'clear' ];
  var missingFunctions = cacheFunctions
    .filter(fnName => cacheMap && typeof cacheMap[fnName] !== 'function');
  if (missingFunctions.length !== 0) {
    throw new TypeError(
      'Custom cacheMap missing methods: ' + missingFunctions.join(', ')
    );
  }
  return cacheMap;
}

// Private
function isArrayLike(x: mixed): boolean {
  return (
    typeof x === 'object' &&
    x !== null &&
    typeof x.length === 'number' &&
    (x.length === 0 ||
      (x.length > 0 && Object.prototype.hasOwnProperty.call(x, x.length - 1)))
  );
}

module.exports = DataLoader;
