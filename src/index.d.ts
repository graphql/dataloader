/**
 * Copyright (c) 2019-present, GraphQL Foundation
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

/**
 * DataLoader creates a public API for loading data from a particular
 * data back-end with unique keys such as the id column of a SQL table
 * or document name in a MongoDB database, given a batch loading function.
 *
 * Each DataLoader instance contains a unique memoized cache. Use caution
 * when used in long-lived applications or those which serve many users
 * with different access permissions and consider creating a new instance
 * per web request.
 */
declare class DataLoader<K, V, C = K> {

  constructor(batchLoadFn: DataLoader.BatchLoadFn<K, V>, options?: DataLoader.Options<K, V, C>);

  /**
   * Loads a key, returning a `Promise` for the value represented by that key.
   */
  load(key: K): Promise<V>;

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
  loadMany(keys: ArrayLike<K>): Promise<V[]>;

  /**
   * Clears the value at `key` from the cache, if it exists. Returns itself for
   * method chaining.
   */
  clear(key: K): this;

  /**
   * Clears the entire cache. To be used when some event results in unknown
   * invalidations across this particular `DataLoader`. Returns itself for
   * method chaining.
   */
  clearAll(): this;

  /**
   * Adds the provied key and value to the cache. If the key already exists, no
   * change is made. Returns itself for method chaining.
   */
  prime(key: K, value: V | Error): this;
}

declare namespace DataLoader {
  // If a custom cache is provided, it must be of this type (a subset of ES6 Map).
  export type CacheMap<K, V> = {
    get(key: K): V | void;
    set(key: K, value: V): any;
    delete(key: K): any;
    clear(): any;
  }

  // A Function, which when given an Array of keys, returns a Promise of an Array
  // of values or Errors.
  export type BatchLoadFn<K, V> =
    (keys: ArrayLike<K>) => PromiseLike<ArrayLike<V | Error>>;

  // Optionally turn off batching or caching or provide a cache key function or a
  // custom cache instance.
  export type Options<K, V, C = K> = {

    /**
     * Default `true`. Set to `false` to disable batching,
     * instead immediately invoking `batchLoadFn` with a
     * single load key.
     */
    batch?: boolean,

    /**
     * Default `Infinity`. Limits the number of items that get
     * passed in to the `batchLoadFn`.
     */
    maxBatchSize?: number;

    /**
     * Default `true`. Set to `false` to disable memoization caching,
     * instead creating a new Promise and new key in the `batchLoadFn` for every
     * load of the same key.
     */
    cache?: boolean,

    /**
     * A function to produce a cache key for a given load key.
     * Defaults to `key => key`. Useful to provide when JavaScript
     * objects are keys and two similarly shaped objects should
     * be considered equivalent.
     */
    cacheKeyFn?: (key: K) => C,

    /**
     * An instance of Map (or an object with a similar API) to
     * be used as the underlying cache for this loader.
     * Default `new Map()`.
     */
    cacheMap?: CacheMap<C, Promise<V>>;
  }
}

export = DataLoader;
