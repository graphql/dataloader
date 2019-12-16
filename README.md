# DataLoader

DataLoader is a generic utility to be used as part of your application's data
fetching layer to provide a simplified and consistent API over various remote
data sources such as databases or web services via batching and caching.

[![Build Status](https://travis-ci.org/graphql/dataloader.svg)](https://travis-ci.org/graphql/dataloader)
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

To get started, create a `DataLoader`. Each `DataLoader` instance represents a
unique cache. Typically instances are created per request when used within a
web-server like [express][] if different users can see different things.

> Note: DataLoader assumes a JavaScript environment with global ES6 `Promise`
and `Map` classes, available in all supported versions of Node.js.


## Batching

Batching is not an advanced feature, it's DataLoader's primary feature.
Create loaders by providing a batch loading function.

```js
var DataLoader = require('dataloader')

var userLoader = new DataLoader(keys => myBatchGetUsers(keys));
```

A batch loading function accepts an Array of keys, and returns a Promise which
resolves to an Array of values[<sup>*</sup>](#batch-function).

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

#### Batch Function

A batch loading function accepts an Array of keys, and returns a Promise which
resolves to an Array of values. There are a few constraints that must be upheld:

 * The Array of values must be the same length as the Array of keys.
 * Each index in the Array of values must correspond to the same index in the Array of keys.

For example, if your batch function was provided the Array of keys: `[ 2, 9, 6, 1 ]`,
and loading from a back-end service returned the values:

```js
{ id: 9, name: 'Chicago' }
{ id: 1, name: 'New York' }
{ id: 2, name: 'San Francisco' }
```

Our back-end service returned results in a different order than we requested, likely
because it was more efficient for it to do so. Also, it omitted a result for key `6`,
which we can interpret as no value existing for that key.

To uphold the constraints of the batch function, it must return an Array of values
the same length as the Array of keys, and re-order them to ensure each index aligns
with the original keys `[ 2, 9, 6, 1 ]`:

```js
[
  { id: 2, name: 'San Francisco' },
  { id: 9, name: 'Chicago' },
  null,
  { id: 1, name: 'New York' }
]
```


## Caching

DataLoader provides a memoization cache for all loads which occur in a single
request to your application. After `.load()` is called once with a given key,
the resulting value is cached to eliminate redundant loads.

In addition to relieving pressure on your data storage, caching results per-request
also creates fewer objects which may relieve memory pressure on your application:

```js
var userLoader = new DataLoader(...)
var promise1A = userLoader.load(1)
var promise1B = userLoader.load(1)
assert(promise1A === promise1B)
```

#### Caching per-Request

DataLoader caching *does not* replace Redis, Memcache, or any other shared
application-level cache. DataLoader is first and foremost a data loading mechanism,
and its cache only serves the purpose of not repeatedly loading the same data in
the context of a single request to your Application. To do this, it maintains a
simple in-memory memoization cache (more accurately: `.load()` is a memoized function).

Avoid multiple requests from different users using the DataLoader instance, which
could result in cached data incorrectly appearing in each request. Typically,
DataLoader instances are created when a Request begins, and are not used once the
Request ends.

For example, when using with [express][]:

```js
function createLoaders(authToken) {
  return {
    users: new DataLoader(ids => genUsers(authToken, ids)),
  }
}

var app = express()

app.get('/', function(req, res) {
  var authToken = authenticateUser(req)
  var loaders = createLoaders(authToken)
  res.send(renderPage(req, loaders))
})

app.listen()
```

#### Clearing Cache

In certain uncommon cases, clearing the request cache may be necessary.

The most common example when clearing the loader's cache is necessary is after
a mutation or update within the same request, when a cached value could be out of
date and future loads should not use any possibly cached value.

Here's a simple example using SQL UPDATE to illustrate.

```js
// Request begins...
var userLoader = new DataLoader(...)

// And a value happens to be loaded (and cached).
userLoader.load(4).then(...)

// A mutation occurs, invalidating what might be in cache.
sqlRun('UPDATE users WHERE id=4 SET username="zuck"').then(
  () => userLoader.clear(4)
)

// Later the value load is loaded again so the mutated data appears.
userLoader.load(4).then(...)

// Request completes.
```

#### Caching Errors

If a batch load fails (that is, a batch function throws or returns a rejected
Promise), then the requested values will not be cached. However if a batch
function returns an `Error` instance for an individual value, that `Error` will
be cached to avoid frequently loading the same `Error`.

In some circumstances you may wish to clear the cache for these individual Errors:

```js
userLoader.load(1).catch(error => {
  if (/* determine if should clear error */) {
    userLoader.clear(1);
  }
  throw error;
});
```

#### Disabling Cache

In certain uncommon cases, a DataLoader which *does not* cache may be desirable.
Calling `new DataLoader(myBatchFn, { cache: false })` will ensure that every
call to `.load()` will produce a *new* Promise, and requested keys will not be
saved in memory.

However, when the memoization cache is disabled, your batch function will
receive an array of keys which may contain duplicates! Each key will be
associated with each call to `.load()`. Your batch loader should provide a value
for each instance of the requested key.

For example:

```js
var myLoader = new DataLoader(keys => {
  console.log(keys)
  return someBatchLoadFn(keys)
}, { cache: false })

myLoader.load('A')
myLoader.load('B')
myLoader.load('A')

// > [ 'A', 'B', 'A' ]
```

More complex cache behavior can be achieved by calling `.clear()` or `.clearAll()`
rather than disabling the cache completely. For example, this DataLoader will
provide unique keys to a batch function due to the memoization cache being
enabled, but will immediately clear its cache when the batch function is called
so later requests will load new values.

```js
var myLoader = new DataLoader(keys => {
  identityLoader.clearAll()
  return someBatchLoadFn(keys)
})
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

  | Option Key | Type | Default | Description |
  | ---------- | ---- | ------- | ----------- |
  | *batch*  | Boolean | `true` | Set to `false` to disable batching, invoking `batchLoadFn` with a single load key.
  | *maxBatchSize* | Number | `Infinity` | Limits the number of items that get passed in to the `batchLoadFn`.
  | *cache* | Boolean | `true` | Set to `false` to disable memoization caching, creating a new Promise and new key in the `batchLoadFn` for every load of the same key. 
  | *cacheKeyFn* | Function | `key => key` | Produces cache key for a given load key. Useful when objects are keys and two objects should be considered equivalent.
  | *cacheMap* | Object | `new Map()` | Instance of [Map][] (or an object with a similar API) to be used as cache.

##### `load(key)`

Loads a key, returning a `Promise` for the value represented by that key.

- *key*: A key value to load.

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

- *key*: A key value to clear.

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
[SQLite](examples/SQL.md) example with clearer code and at most 4 database requests,
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
one cache across many users, and is encouraged to create a new DataLoader
per request:

```js
function createLoaders(authToken) {
  return {
    users: new DataLoader(ids => genUsers(authToken, ids)),
    cdnUrls: new DataLoader(rawUrls => genCdnUrls(authToken, rawUrls)),
    stories: new DataLoader(keys => genStories(authToken, keys)),
  };
}

// When handling an incoming web request:
var loaders = createLoaders(request.query.authToken);

// Then, within application logic:
var user = await loaders.users.load(4);
var pic = await loaders.cdnUrls.load(user.rawPicUrl);
```

Creating an object where each key is a `DataLoader` is one common pattern which
provides a single value to pass around to code which needs to perform
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

DataLoader can optionally be provided a custom Map instance to use as its
memoization cache. More specifically, any object that implements the methods `get()`,
`set()`, `delete()` and `clear()` can be provided. This allows for custom Maps
which implement various [cache algorithms][] to be provided. By default,
DataLoader uses the standard [Map][] which simply grows until the DataLoader
is released. The default is appropriate when requests to your application are
short-lived.


## Common Back-ends

Looking to get started with a specific back-end? Try the [loaders in the examples directory](/examples).

## Other implementations

* PHP
  * [DataLoaderPHP](https://github.com/overblog/dataloader-php)
* Ruby
  * [GraphQL Batch](https://github.com/Shopify/graphql-batch)
  * [Dataloader](https://github.com/sheerun/dataloader)
  * [BatchLoader](https://github.com/exaspark/batch-loader)
* ReasonML
  * [bs-dataloader](https://github.com/ulrikstrid/bs-dataloader)
* Java
  * [java-dataloader](https://github.com/graphql-java/java-dataloader)
* Elixir
  * [dataloader](https://github.com/absinthe-graphql/dataloader)
* Golang
  * [Dataloader](https://github.com/nicksrandall/dataloader)
* Rust
  * [Dataloader](https://github.com/cksac/dataloader-rs)
* Perl
  * [perl-DataLoader](https://github.com/richardjharris/perl-DataLoader)

## Video Source Code Walkthrough

**DataLoader Source Code Walkthrough (YouTube):**

<a href="https://youtu.be/OQTnXNCDywA" target="_blank" alt="DataLoader Source Code Walkthrough"><img src="https://img.youtube.com/vi/OQTnXNCDywA/0.jpg" /></a>


[@schrockn]: https://github.com/schrockn
[Map]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map
[graphql-js]: https://github.com/graphql/graphql-js
[cache algorithms]: https://en.wikipedia.org/wiki/Cache_algorithms
[express]: http://expressjs.com/
[babel/polyfill]: https://babeljs.io/docs/usage/polyfill/


         Apache License
                           Version 2.0, January 2004
                        https://www.apache.org/licenses/

   TERMS AND CONDITIONS FOR USE, REPRODUCTION, AND DISTRIBUTION

   1. Definitions.

      "License" shall mean the terms and conditions for use, reproduction,
      and distribution as defined by Sections 1 through 9 of this document.

      "Licensor" shall mean the copyright owner or entity authorized by
      the copyright owner that is granting the License.

      "Legal Entity" shall mean the union of the acting entity and all
      other entities that control, are controlled by, or are under common
      control with that entity. For the purposes of this definition,
      "control" means (i) the power, direct or indirect, to cause the
      direction or management of such entity, whether by contract or
      otherwise, or (ii) ownership of fifty percent (50%) or more of the
      outstanding shares, or (iii) beneficial ownership of such entity.

      "You" (or "Your") shall mean an individual or Legal Entity
      exercising permissions granted by this License.

      "Source" form shall mean the preferred form for making modifications,
      including but not limited to software source code, documentation
      source, and configuration files.

      "Object" form shall mean any form resulting from mechanical
      transformation or translation of a Source form, including but
      not limited to compiled object code, generated documentation,
      and conversions to other media types.

      "Work" shall mean the work of authorship, whether in Source or
      Object form, made available under the License, as indicated by a
      copyright notice that is included in or attached to the work
      (an example is provided in the Appendix below).

      "Derivative Works" shall mean any work, whether in Source or Object
      form, that is based on (or derived from) the Work and for which the
      editorial revisions, annotations, elaborations, or other modifications
      represent, as a whole, an original work of authorship. For the purposes
      of this License, Derivative Works shall not include works that remain
      separable from, or merely link (or bind by name) to the interfaces of,
      the Work and Derivative Works thereof.

      "Contribution" shall mean any work of authorship, including
      the original version of the Work and any modifications or additions
      to that Work or Derivative Works thereof, that is intentionally
      submitted to Licensor for inclusion in the Work by the copyright owner
      or by an individual or Legal Entity authorized to submit on behalf of
      the copyright owner. For the purposes of this definition, "submitted"
      means any form of electronic, verbal, or written communication sent
      to the Licensor or its representatives, including but not limited to
      communication on electronic mailing lists, source code control systems,
      and issue tracking systems that are managed by, or on behalf of, the
      Licensor for the purpose of discussing and improving the Work, but
      excluding communication that is conspicuously marked or otherwise
      designated in writing by the copyright owner as "Not a Contribution."

      "Contributor" shall mean Licensor and any individual or Legal Entity
      on behalf of whom a Contribution has been received by Licensor and
      subsequently incorporated within the Work.

   2. Grant of Copyright License. Subject to the terms and conditions of
      this License, each Contributor hereby grants to You a perpetual,
      worldwide, non-exclusive, no-charge, royalty-free, irrevocable
      copyright license to reproduce, prepare Derivative Works of,
      publicly display, publicly perform, sublicense, and distribute the
      Work and such Derivative Works in Source or Object form.

   3. Grant of Patent License. Subject to the terms and conditions of
      this License, each Contributor hereby grants to You a perpetual,
      worldwide, non-exclusive, no-charge, royalty-free, irrevocable
      (except as stated in this section) patent license to make, have made,
      use, offer to sell, sell, import, and otherwise transfer the Work,
      where such license applies only to those patent claims licensable
      by such Contributor that are necessarily infringed by their
      Contribution(s) alone or by combination of their Contribution(s)
      with the Work to which such Contribution(s) was submitted. If You
      institute patent litigation against any entity (including a
      cross-claim or counterclaim in a lawsuit) alleging that the Work
      or a Contribution incorporated within the Work constitutes direct
      or contributory patent infringement, then any patent licenses
      granted to You under this License for that Work shall terminate
      as of the date such litigation is filed.

   4. Redistribution. You may reproduce and distribute copies of the
      Work or Derivative Works thereof in any medium, with or without
      modifications, and in Source or Object form, provided that You
      meet the following conditions:

      (a) You must give any other recipients of the Work or
          Derivative Works a copy of this License; and

      (b) You must cause any modified files to carry prominent notices
          stating that You changed the files; and

      (c) You must retain, in the Source form of any Derivative Works
          that You distribute, all copyright, patent, trademark, and
          attribution notices from the Source form of the Work,
          excluding those notices that do not pertain to any part of
          the Derivative Works; and

      (d) If the Work includes a "NOTICE" text file as part of its
          distribution, then any Derivative Works that You distribute must
          include a readable copy of the attribution notices contained
          within such NOTICE file, excluding those notices that do not
          pertain to any part of the Derivative Works, in at least one
          of the following places: within a NOTICE text file distributed
          as part of the Derivative Works; within the Source form or
          documentation, if provided along with the Derivative Works; or,
          within a display generated by the Derivative Works, if and
          wherever such third-party notices normally appear. The contents
          of the NOTICE file are for informational purposes only and
          do not modify the License. You may add Your own attribution
          notices within Derivative Works that You distribute, alongside
          or as an addendum to the NOTICE text from the Work, provided
          that such additional attribution notices cannot be construed
          as modifying the License.

      You may add Your own copyright statement to Your modifications and
      may provide additional or different license terms and conditions
      for use, reproduction, or distribution of Your modifications, or
      for any such Derivative Works as a whole, provided Your use,
      reproduction, and distribution of the Work otherwise complies with
      the conditions stated in this License.

   5. Submission of Contributions. Unless You explicitly state otherwise,
      any Contribution intentionally submitted for inclusion in the Work
      by You to the Licensor shall be under the terms and conditions of
      this License, without any additional terms or conditions.
      Notwithstanding the above, nothing herein shall supersede or modify
      the terms of any separate license agreement you may have executed
      with Licensor regarding such Contributions.

   6. Trademarks. This License does not grant permission to use the trade
      names, trademarks, service marks, or product names of the Licensor,
      except as required for reasonable and customary use in describing the
      origin of the Work and reproducing the content of the NOTICE file.

   7. Disclaimer of Warranty. Unless required by applicable law or
      agreed to in writing, Licensor provides the Work (and each
      Contributor provides its Contributions) on an "AS IS" BASIS,
      WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or
      implied, including, without limitation, any warranties or conditions
      of TITLE, NON-INFRINGEMENT, MERCHANTABILITY, or FITNESS FOR A
      PARTICULAR PURPOSE. You are solely responsible for determining the
      appropriateness of using or redistributing the Work and assume any
      risks associated with Your exercise of permissions under this License.

   8. Limitation of Liability. In no event and under no legal theory,
      whether in tort (including negligence), contract, or otherwise,
      unless required by applicable law (such as deliberate and grossly
      negligent acts) or agreed to in writing, shall any Contributor be
      liable to You for damages, including any direct, indirect, special,
      incidental, or consequential damages of any character arising as a
      result of this License or out of the use or inability to use the
      Work (including but not limited to damages for loss of goodwill,
      work stoppage, computer failure or malfunction, or any and all
      other commercial damages or losses), even if such Contributor
      has been advised of the possibility of such damages.

   9. Accepting Warranty or Additional Liability. While redistributing
      the Work or Derivative Works thereof, You may choose to offer,
      and charge a fee for, acceptance of support, warranty, indemnity,
      or other liability obligations and/or rights consistent with this
      License. However, in accepting such obligations, You may act only
      on Your own behalf and on Your sole responsibility, not on behalf
      of any other Contributor, and only if You agree to indemnify,
      defend, and hold each Contributor harmless for any liability
      incurred by, or claims asserted against, such Contributor by reason
      of your accepting any such warranty or additional liability.

   END OF TERMS AND CONDITIONS

   APPENDIX: How to apply the Apache License to your work.

      To apply the Apache License to your work, attach the following
      boilerplate notice, with the fields enclosed by brackets "[]"
      replaced with your own identifying information. (Don't include
      the brackets!)  The text should be enclosed in the appropriate
      comment syntax for the file format. We also recommend that a
      file or class name and description of purpose be included on the
      same "printed page" as the copyright notice for easier
      identification within third-party archives.

   Copyright 2019 Rolando Gopez Lacuata.

   Licensed under the Apache License, Version 2.0 (the "License");
   you may not use this file except in compliance with the License.
   You may obtain a copy of the License at

       https://www.apache.org/licenses/LICENSE-2.0

   Unless required by applicable law or agreed to in writing, software
   distributed under the License is distributed on an "AS IS" BASIS,
   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   See the License for the specific language governing permissions and
   limitations under the License.

