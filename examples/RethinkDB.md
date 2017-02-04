# RethinkDb

RethinkDb offers a batching method called `getAll` but there are a few caveats :
* Order of results is not guaranteed ([rethinkdb/rethinkdb#5187](https://github.com/rethinkdb/rethinkdb/issues/5187))
* Non-existent keys will not return and empty record
Assuming a table `example_table` with those records :
```js
[
  {"id": 1, "name": "Document 1"},
  {"id": 2, "name": "Document 2"}
]
```
A query `r.getAll(1, 2, 3)` could return such an array :
```js
[
  {"id": 2, "name": "Document 2"},
  {"id": 1, "name": "Document 1"}
]
```

In essence, this naive implementation won't work :
```js
var r = require('rethinkdb');
var db = await r.connect();

var batchLoadFn = keys => db.table('example_table').getAll(...keys).then(res => res.toArray());
var exampleLoader = new DataLoader(batchLoadFn);

await exampleLoader.loadMany([1, 2, 3]); // Throws, values length !== keys length

await exampleLoader.loadMany([1, 2]);
await exampleLoader.load(1); // {"id": 2, "name": "Document 2"}
```

A solution is to normalize results returned by `getAll` to match the structure of supplied `keys`.

To achieve this efficiently, we first write an indexing function. This function will return a Map indexing results.
Parameters :
* `results` : Array of RethinkDb results
* `indexField` : String indicating which field was used as index for this batch query
* `cacheKeyFn` : Optional function used to serialize non-scalar index field values
```js
function indexResults(results, indexField, cacheKeyFn = key => key) {
  var indexedResults = new Map();
  results.forEach(res => {
    indexedResults.set(cacheKeyFn(res[indexField]), res);
  });
  return indexedResults;
}
```
Then, we can leverage our Map to normalize RethinkDb results with another utility function which will produce a normalizing function.
```js
function normalizeRethinkDbResults(keys, indexField, cacheKeyFn = key => key) {
  return results => {
    var indexedResults = indexResults(results, indexField, cacheKeyFn);
    return keys.map(val => indexedResults.get(cacheKeyFn(val)) || new Error(`Key not found : ${val}`));
  }
}
```

Full dataloader implementation :
```js
var r = require('rethinkdb');
var db = await r.connect();

var batchLoadFn = keys => db.table('example_table')
  .getAll(...keys)
  .then(res => res.toArray())
  .then(normalizeRethinkDbResults(keys, 'id'));

var exampleLoader = new DataLoader(batchLoadFn);

await exampleLoader.loadMany([1, 2, 3]); // [{"id": 1, "name": "Document 1"}, {"id": 2, "name": "Document 2"}, Error];

await exampleLoader.load(1); // {"id": 1, "name": "Document 1"}
```
