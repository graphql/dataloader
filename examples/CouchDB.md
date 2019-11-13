# Using DataLoader with CouchDB

CouchDB is a "NoSQL" document database which supports batch loading via the
[HTTP Bulk Document API](http://wiki.apache.org/couchdb/HTTP_Bulk_Document_API),
making it well suited for use with DataLoader.

This example uses the [nano][] CouchDB client which offers a `fetch` method
supporting the bulk document API.

```js
const DataLoader = require('dataloader');
const nano = require('nano');

const couch = nano('http://localhost:5984');

const userDB = couch.use('users');
const userLoader = new DataLoader(keys => new Promise((resolve, reject) => {
  userDB.fetch({ keys: keys }, (error, docs) => {
    if (error) {
      return reject(error);
    }
    resolve(docs.rows.map(row => row.error ? new Error(row.error) : row.doc));
  });
}));

// Usage

const promise1 = userLoader.load('8fce1902834ac6458e9886fa7f89c0ef');
const promise2 = userLoader.load('00a271787f89c0ef2e10e88a0c00048b');
const [ user1, user2 ] = await Promise.all([ promise1, promise2 ])
console.log(user1, user2);
```

[nano]: https://github.com/dscape/nano
