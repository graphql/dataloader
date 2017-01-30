# Using DataLoader with Redis

Redis is a very simple key-value store which provides the batch load method
[MGET](http://redis.io/commands/mget) which makes it very well suited for use
with DataLoader.

Here we build an example Redis DataLoader using [node_redis][].

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

[node_redis]: https://github.com/NodeRedis/node_redis
