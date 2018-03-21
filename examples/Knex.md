# Using DataLoader with Knex.js

This example demonstrates how to use **DataLoader** with SQL databases via
[Knex.js][knex], which is a SQL query builder and a client for popular
databases such as **PostgreSQL**, **MySQL**, **MariaDB** etc.

Similarly to the [SQL](./SQL.md) example, you can use "where in" clause to
fetch multiple records by the list of IDs with the only difference that you
don't have to write any SQL code by hand.

```js
const DataLoader = require('dataloader');
const db = require('./db'); // an instance of Knex client

// The list of data loaders

const data = {
  user: new DataLoader(ids => db.table('users')
    .whereIn('id', ids).select()
    .then(mapTo(ids, row => row.id)),

  story: new DataLoader(ids => db.table('stories')
    .whereIn('id', ids).select()
    .then(mapTo(ids, row => row.id)),

  storiesByUserId: new DataLoader(ids => db.table('stories')
    .whereIn('author_id', ids).select()
    .then(mapToMany(ids, row => row.author_id)),
};

const mapTo = (ids, selector) => rows => ids.map(id => rows.find(x => selector(x) === id));
// or a faster version
const mapTo = (ids, selector) => rows => {
  const m = new Map(rows.map(row => [selector(row), row]));
  return ids.map(id => m.get(id));
};

const mapToMany = (ids, selector) => rows => ids.map(id => rows.filter(x => selector(x) === id));
// or a slightly faster version
const mapToMany = (ids, selector) => rows => {
  const m = rows.reduce((m, row) => m.set(selector(row), (m.get(selector(row)) || []).concat(row)), new Map());
  return ids.map(id => m.get(id));
}

// Usage

Promise.all([
  data.user.load('1234'),
  data.storiesByUserId.load('1234'),
]).then(([user, stories]) => {/* ... */});
```

For a complete example visit [kriasoft/nodejs-api-starter][nsk].

[knex]: http://knexjs.org/
[nsk]: https://github.com/kriasoft/nodejs-api-starter#readme
