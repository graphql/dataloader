# DataLoader

DataLoader is a generic utility to be used as part of your application's data
fetching layer to provide a simplified and consistent API over various remote
data sources such as databases or web services via batching and caching.

[![Build Status](https://travis-ci.org/facebook/dataloader.svg)](https://travis-ci.org/facebook/dataloader)
[![Coverage Status](https://coveralls.io/repos/facebook/dataloader/badge.svg?branch=master&service=github)](https://coveralls.io/github/facebook/dataloader?branch=master)

A port of the "Loader" API originally developed by [@schrockn][] at Facebook in
2010 as a simplifying force to coalesce the sundry key-value store back-end
APIs which existed at the time. At Facebook, "Loader" became one of the
implementation details of the "Ent" framework, a privacy-aware data entity
loading and caching layer within web server product code. This ultimately became
the underpinning for Facebook's GraphQL server implementation and type
definitions.

DataLoader is a simplified version of this original idea implemented in
JavaScript for Node.js services. DataLoader is often used when implementing a
[graphql-js][] service, though it is also broadly useful in other situations.

This mechanism of batching and caching data requests is certainly not unique to
Node.js or JavaScript, it is also the primary motivation for
[Haxl](https://github.com/facebook/Haxl), Facebook's data loading library
for Haskell. More about how Haxl works can be read in this [blog post](https://code.facebook.com/posts/302060973291128/open-sourcing-haxl-a-library-for-haskell/).

DataLoader is provided so that it may be useful not just to build GraphQL
services for Node.js but also as a publicly available reference implementation
of this concept in the hopes that it can be ported to other languages. If you
port DataLoader to another language, please open an issue to include a link from
this repository.


## Getting Started

First, install DataLoader using npm.

```sh
npm install --save dataloader
```

DataLoader assumes a JavaScript environment with global ES6 `Promise` and `Map`
classes, available in the recent versions of node.js or when using
[babel/polyfill][]. If your environment does not have these, provide them before
using DataLoader.

```js
global.Promise = require('es6-promise')
global.Map = require('es6-map')
```

To get started, create a `DataLoader`. Each `DataLoader` instance represents a
unique cache. You might create each loader once for your whole application, or
create new instances per request when used within a web-server like [express][]
if different users can see different things. It's up to you.

Batching is not an advanced feature, it's DataLoader's primary feature.
Create loaders by providing a batch loading function.

```js
var DataLoader = require('dataloader')

var userLoader = new DataLoader(keys => myBatchGetUsers(keys));
```

A batch loading function accepts an Array of keys, and returns a Promise which
resolves to an Array of values.

Then load individual values from the loader. DataLoader will coalesce all
individual loads which occur within a single frame of execution (a single tick
of the event loop) and then call your batch function with all requested keys.

```js
userLoader.load(1)
  .then(user => userLoader.load(user.invitedByID))
  .then(invitedBy => console.log(`User 1 was invited by ${invitedBy}`));

// Elsewhere in your application
userLoader.load(2)
  .then(user => userLoader.load(user.lastInvitedID))
  .then(lastInvited => console.log(`User 2 last invited ${lastInvited}`));
```

A naive application may have issued four round-trips to a backend for the
required information, but with DataLoader this application will make at most
two.

DataLoader allows you to decouple unrelated parts of your application without
sacrificing the performance of batch data-loading. While the loader presents an
API that loads individual values, all concurrent requests will be coalesced and
presented to your batch loading function. This allows your application to safely
distribute data fetching requirements throughout your application and maintain
minimal outgoing data requests.

### Caching

After being loaded once, the resulting value is cached, eliminating
redundant requests.

In the example above, if User `1` was last invited by User `2`, only a single
round trip will occur.

Caching results in creating fewer objects which may relieve memory pressure on
your application:

```js
var promise1A = userLoader.load(1)
var promise1B = userLoader.load(1)
assert(promise1A === promise1B)
```

There are two common examples when clearing the loader's cache is necessary:

*Mutations:* after a mutation or update, a cached value may be out of date.
Future loads should not use any possibly cached value.

Here's a simple example using SQL UPDATE to illustrate.

```js
sqlRun('UPDATE users WHERE id=4 SET username="zuck"').then(
  () => userLoader.clear(4)
)
```

*Transient Errors:* A load may fail because it simply can't be loaded
(a permanent issue) or it may fail because of a transient issue such as a down
database or network issue. For transient errors, clear the cache:

```js
userLoader.load(1).catch(error => {
  if (/* determine if error is transient */) {
    userLoader.clear(1);
  }
  throw error;
});
```


## API

#### class DataLoader

DataLoader creates a public API for loading data from a particular
data back-end with unique keys such as the `id` column of a SQL table or
document name in a MongoDB database, given a batch loading function.

Each `DataLoader` instance contains a unique memoized cache. Use caution when
used in long-lived applications or those which serve many users with different
access permissions and consider creating a new instance per web request.

##### `new DataLoader(batchLoadFn [, options])`

Create a new `DataLoader` given a batch loading function and options.

- *batchLoadFn*: A function which accepts an Array of keys, and returns a
  Promise which resolves to an Array of values.

- *options*: An optional object of options:

  - *batch*: Default `true`. Set to `false` to disable batching, instead
    immediately invoking `batchLoadFn` with a single load key.

  - *maxBatchSize*: Default `Infinity`. Limits the number of items that get
    passed in to the `batchLoadFn`.

  - *cache*: Default `true`. Set to `false` to disable caching, instead
    creating a new Promise and new key in the `batchLoadFn` for every load.

  - *cacheKeyFn*: A function to produce a cache key for a given load key.
    Defaults to `key => key`. Useful to provide when JavaScript objects are keys
    and two similarly shaped objects should be considered equivalent.

  - *cacheMap*: An instance of [Map][] (or an object with a similar API) to be
    used as the underlying cache for this loader. Default `new Map()`.

##### `load(key)`

Loads a key, returning a `Promise` for the value represented by that key.

- *key*: An key value to load.

##### `loadMany(keys)`

Loads multiple keys, promising an array of values:

```js
var [ a, b ] = await myLoader.loadMany([ 'a', 'b' ]);
```

This is equivalent to the more verbose:

```js
var [ a, b ] = await Promise.all([
  myLoader.load('a'),
  myLoader.load('b')
]);
```

- *keys*: An array of key values to load.

##### `clear(key)`

Clears the value at `key` from the cache, if it exists. Returns itself for
method chaining.

- *key*: An key value to clear.

##### `clearAll()`

Clears the entire cache. To be used when some event results in unknown
invalidations across this particular `DataLoader`. Returns itself for
method chaining.

##### `prime(key, value)`

Primes the cache with the provided key and value. If the key already exists, no
change is made. (To forcefully prime the cache, clear the key first with
`loader.clear(key).prime(key, value)`.) Returns itself for method chaining.


## Using with GraphQL

DataLoader pairs nicely well with [GraphQL][graphql-js]. GraphQL fields are
designed to be stand-alone functions. Without a caching or batching mechanism,
it's easy for a naive GraphQL server to issue new database requests each time a
field is resolved.

Consider the following GraphQL request:

```
{
  me {
    name
    bestFriend {
      name
    }
    friends(first: 5) {
      name
      bestFriend {
        name
      }
    }
  }
}
```

Naively, if `me`, `bestFriend` and `friends` each need to request the backend,
there could be at most 13 database requests!

When using DataLoader, we could define the `User` type using the
[SQLLite](#sqlite) example with clearer code and at most 4 database requests,
and possibly fewer if there are cache hits.

```js
var UserType = new GraphQLObjectType({
  name: 'User',
  fields: () => ({
    name: { type: GraphQLString },
    bestFriend: {
      type: UserType,
      resolve: user => userLoader.load(user.bestFriendID)
    },
    friends: {
      args: {
        first: { type: GraphQLInt }
      },
      type: new GraphQLList(UserType),
      resolve: (user, { first }) => queryLoader.load([
        'SELECT toID FROM friends WHERE fromID=? LIMIT ?', user.id, first
      ]).then(rows => rows.map(row => userLoader.load(row.toID)))
    }
  })
})
```


## Common Patterns

### Creating a new DataLoader per request.

In many applications, a web server using DataLoader serves requests to many
different users with different access permissions. It may be dangerous to use
one cache across many users, and is encouraged to create a new cache
per request:

```js
function createLoaders(authToken) {
  return {
    users: new DataLoader(ids => genUsers(authToken, ids)),
    cdnUrls: new DataLoader(rawUrls => genCdnUrls(authToken, rawUrls)),
    stories: new DataLoader(keys => genStories(authToken, keys)),
  };
}

// Later, in an web request handler:
var loaders = createLoaders(request.query.authToken);

// Then, within application logic:
var user = await loaders.users.load(4);
var pic = await loaders.cdnUrls.load(user.rawPicUrl);
```

Creating an object where each key is a `DataLoader` is also a common pattern.
This provides a single value to pass around to code which needs to perform
data loading, such as part of the `rootValue` in a [graphql-js][] request.

### Loading by alternative keys.

Occasionally, some kind of value can be accessed in multiple ways. For example,
perhaps a "User" type can be loaded not only by an "id" but also by a "username"
value. If the same user is loaded by both keys, then it may be useful to fill
both caches when a user is loaded from either source:

```js
let userByIDLoader = new DataLoader(ids => genUsersByID(ids).then(users => {
  for (let user of users) {
    usernameLoader.prime(user.username, user);
  }
  return users;
}));

let usernameLoader = new DataLoader(names => genUsernames(names).then(users => {
  for (let user of users) {
    userByIDLoader.prime(user.id, user);
  }
  return users;
}));
```

## Custom Caches

DataLoader can optionaly be provided a custom Map instance to use as its
cache. More specifically, any object that implements the methods `get()`,
`set()`, `delete()` and `clear()` can be provided. This allows for custom Maps
which implement various [cache algorithms][] to be provided. By default,
DataLoader uses the standard [Map][] which simply grows until the DataLoader
is released.


## Common Back-ends

Looking to get started with a specific back-end? Try these example loaders:


#### Redis

Redis is a very simple key-value store which provides the batch load method
[MGET](http://redis.io/commands/mget). Here we build a Redis DataLoader
using [node_redis][].

```js
var DataLoader = require('dataloader');
var redis = require('redis');

var client = redis.createClient();

var redisLoader = new DataLoader(keys => new Promise((resolve, reject) => {
  client.mget(keys, (error, results) => {
    if (error) {
      return reject(error);
    }
    resolve(results.map((result, index) =>
      result !== null ? result : new Error(`No key: ${keys[index]}`)
    ));
  });
}));
```


#### CouchDB

This example uses the [nano][] CouchDB client which offers a `fetch` method
implementing the [HTTP Bulk Document API](http://wiki.apache.org/couchdb/HTTP_Bulk_Document_API).

```js
var DataLoader = require('dataloader');
var nano = require('nano');

var couch = nano('http://localhost:5984');

var userDB = couch.use('users');
var userLoader = new DataLoader(keys => new Promise((resolve, reject) => {
  userDB.fetch({ keys: keys }, (error, docs) => {
    if (error) {
      return reject(error);
    }
    resolve(docs.rows.map(row => row.error ? new Error(row.error) : row.doc));
  });
}));

// Usage

var promise1 = userLoader.load('8fce1902834ac6458e9886fa7f89c0ef');
var promise2 = userLoader.load('00a271787f89c0ef2e10e88a0c00048b');

Promise.all([ promise1, promise2 ]).then(([ user1, user2]) => {
  console.log(user1, user2);
});
```


#### SQLite

SQL offers a natural batch mechanism with `SELECT * WHERE IN`. `DataLoader`
is designed to operate over key-value stores, so in this example just requests
the entire row at a given `id`.

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

## Video Source Code Walkthrough

**DataLoader Source Code Walkthrough (YouTube):**

<a href="https://youtu.be/OQTnXNCDywA" target="_blank" alt="DataLoader Source Code Walkthrough"><img src="https://img.youtube.com/vi/OQTnXNCDywA/0.jpg" /></a>


[@schrockn]: https://github.com/schrockn
[Map]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map
[graphql-js]: https://github.com/graphql/graphql-js
[cache algorithms]: https://en.wikipedia.org/wiki/Cache_algorithms
[express]: http://expressjs.com/
[babel/polyfill]: https://babeljs.io/docs/usage/polyfill/
[node_redis]: https://github.com/NodeRedis/node_redis
[nano]: https://github.com/dscape/nano
[sqlite3]: https://github.com/mapbox/node-sqlite3
