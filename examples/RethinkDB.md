# RethinkDb

RethinkDb offers a batching method called `getAll` but there are a few caveats :
* Order of results is not guaranteed ([rethinkdb/rethinkdb#5187](https://github.com/rethinkdb/rethinkdb/issues/5187))
* Non-existent keys will not return an empty record

For example, against a table `example_table` with these records:

```js
[
  {"id": 1, "name": "Document 1"},
  {"id": 2, "name": "Document 2"}
]
```

A query `r.getAll(1, 2, 3)` could return:

```js
[
  {"id": 2, "name": "Document 2"},
  {"id": 1, "name": "Document 1"}
]
```

Because query keys and values are associated by position in the dataloader
cache, this naive implementation won't work (with the same table as above):

```js
const r = require('rethinkdb');
const db = await r.connect();

const exampleLoader = new DataLoader(async keys => {
  const result = await db.table('example_table').getAll(...keys)
  return result.toArray()
})

await exampleLoader.loadMany([1, 2, 3]); // Throws (values length !== keys length)

await exampleLoader.loadMany([1, 2]);
await exampleLoader.load(1); // {"id": 2, "name": "Document 2"}
```

A solution is to normalize results returned by `getAll` to match the structure
of supplied `keys`.

To achieve this efficiently, we first write an indexing function. This function
will return a `Map` indexing results.

Parameters:
* `results`: Array of RethinkDb results
* `indexField`: String indicating which field was used as index for this batch query
* `cacheKeyFn`: Optional function used to serialize non-scalar index field values

```js
function indexResults(results, indexField, cacheKeyFn = key => key) {
  const indexedResults = new Map();
  results.forEach(res => {
    indexedResults.set(cacheKeyFn(res[indexField]), res);
  });
  return indexedResults;
}
```

Then, we can leverage our Map to normalize RethinkDb results with another
utility function which will produce a normalizing function.

```js
function normalizeRethinkDbResults(keys, indexField, cacheKeyFn = key => key) {
  return results => {
    const indexedResults = indexResults(results, indexField, cacheKeyFn);
    return keys.map(
      val => indexedResults.get(cacheKeyFn(val))
        || new Error(`Key not found : ${val}`)
    );
  }
}
```

Full dataloader implementation:

```js
const r = require('rethinkdb');
const db = await r.connect();

const exampleLoader = new DataLoader(async keys => {
  const results = await db.table('example_table').getAll(...keys)
  return normalizeRethinkDbResults(res.toArray(), 'id')
})

// [{"id": 1, "name": "Document 1"}, {"id": 2, "name": "Document 2"}, Error];
await exampleLoader.loadMany([1, 2, 3]);

// {"id": 1, "name": "Document 1"}
await exampleLoader.load(1);
```
