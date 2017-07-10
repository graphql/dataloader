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
    .then(rows => ids.map(id => rows.find(x => x.id === id)))),

  story: new DataLoader(ids => db.table('stories')
    .whereIn('id', ids).select()
    .then(rows => ids.map(id => rows.find(x => x.id === id)))),

  storiesByUserId: new DataLoader(ids => db.table('stories')
    .whereIn('author_id', ids).select()
    .then(rows => ids.map(id => rows.filter(x => x.author_id === id)))),
};

// Usage

Promise.all([
  data.user.load('1234'),
  data.storiesByUserId.load('1234'),
]).then(([user, stories]) => {/* ... */});
```

For a complete example visit [kriasoft/nodejs-api-starter][nsk].

[knex]: http://knexjs.org/
[nsk]: https://github.com/kriasoft/nodejs-api-starter#readme
