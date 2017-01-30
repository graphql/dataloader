# Using DataLoader with SQLite

While not a key-value store, SQL offers a natural batch mechanism with
`SELECT * WHERE IN` statements. While `DataLoader` is best suited for key-value
stores, it is still suited for SQL when queries remain simple. This example
requests the entire row at a given `id`, however your usage may differ.

This example uses the [sqlite3][] client which offers a `parallelize` method to
further batch queries together. Another non-caching `DataLoader` utilizes this
method to provide a similar API. `DataLoaders` can access other `DataLoaders`.

```js
var DataLoader = require('dataloader');
var sqlite3 = require('sqlite3');

var db = new sqlite3.Database('./to/your/db.sql');

// Dispatch a WHERE-IN query, ensuring response has rows in correct order.
var userLoader = new DataLoader(ids => {
  var params = ids.map(id => '?' ).join();
  var query = `SELECT * FROM users WHERE id IN (${params})`;
  return queryLoader.load([query, ids]).then(
    rows => ids.map(
      id => rows.find(row => row.id === id) || new Error(`Row not found: ${id}`)
    )
  );
});

// Parallelize all queries, but do not cache.
var queryLoader = new DataLoader(queries => new Promise(resolve => {
  var waitingOn = queries.length;
  var results = [];
  db.parallelize(() => {
    queries.forEach((query, index) => {
      db.all.apply(db, query.concat((error, result) => {
        results[index] = error || result;
        if (--waitingOn === 0) {
          resolve(results);
        }
      }));
    });
  });
}), { cache: false });

// Usage

var promise1 = userLoader.load('1234');
var promise2 = userLoader.load('5678');

Promise.all([ promise1, promise2 ]).then(([ user1, user2]) => {
  console.log(user1, user2);
});
```

[sqlite3]: https://github.com/mapbox/node-sqlite3
