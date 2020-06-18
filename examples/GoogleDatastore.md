# Using DataLoader with Google Datastore

Google Datastore is a "NoSQL" document database which supports [batch operations](https://cloud.google.com/datastore/docs/concepts/entities#batch_operations),
making it well suited for use with DataLoader.

Here we build an example Google Datastore DataLoader using [@google-cloud/datastore](https://cloud.google.com/nodejs/docs/reference/datastore/1.3.x/Datastore).

```js
const Datastore = require('@google-cloud/datastore');

const datastore = new Datastore();

const datastoreLoader = new DataLoader(async keys => {
    const results = await datastore.get(keys)
    // Sort resulting entities by the keys they were requested with.
    const entities = results[0];
    const entitiesByKey = {};
    entities.forEach(entity => {
      entitiesByKey[JSON.stringify(entity[datastore.KEY])] = entity;
    });
    return keys.map(key => entitiesByKey[JSON.stringify(key)] || null);
  },
  {
    // Datastore complex keys need to be converted to a string for use as cache keys
    cacheKeyFn: key => JSON.stringify(key),
  }
);
```
