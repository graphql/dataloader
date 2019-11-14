# Using DataLoader with SQLite

While not a key-value store, SQL offers a natural batch mechanism with
`SELECT * WHERE IN` statements. While `DataLoader` is best suited for key-value
stores, it is still suited for SQL when queries remain simple. This example
requests the entire row at a given `id`, however your usage may differ.

This example uses the [sqlite3][] client which offers a `parallelize` method to
further batch queries together. Another non-caching `DataLoader` utilizes this
method to provide a similar API. `DataLoaders` can access other `DataLoaders`.

```js
const DataLoader = require('dataloader')
const sqlite3 = require('sqlite3')

const db = new sqlite3.Database('./to/your/db.sql')

// Dispatch a WHERE-IN query, ensuring response has rows in correct order.
const userLoader = new DataLoader(ids => new Promise((resolve, reject) => {
  db.all('SELECT * FROM users WHERE id IN $ids', {$ids: ids}, (error, rows) => {
    if (error) {
      reject(error);
    } else {
      resolve(ids.map(id => rows.find(row => rows.id === id)));
    }
  });
}));

// Usage

const promise1 = userLoader.load('1234')
const promise2 = userLoader.load('5678')
const [ user1, user2 ] = await Promise.all([promise1, promise2])
console.log(user1, user2)
```

[sqlite3]: https://github.com/mapbox/node-sqlite3
