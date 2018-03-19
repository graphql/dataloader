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
  return new Promise((resolve, reject) => {
    db.all('SELECT * FROM users WHERE id IN $ids', {$ids: ids}, (err, rows) => {
      if (err) return reject(err);
      const m = new Map(rows.map(r => [r.id, r])); // to allow a simpler reordering
      resolve(ids.map(id => m.get(id)));
    });
  });
});

// Usage

var promise1 = userLoader.load('1234');
var promise2 = userLoader.load('5678');

Promise.all([ promise1, promise2 ]).then(([ user1, user2]) => {
  console.log(user1, user2);
});
// or
userLoader.loadMany(['1234', '5678']).then(console.log);
```

[sqlite3]: https://github.com/mapbox/node-sqlite3
