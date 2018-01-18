# Using DataLoader with Google Datastore

Google Datastore is a "NoSQL" document database which supports [batch operations](https://cloud.google.com/datastore/docs/concepts/entities#batch_operations),
making it well suited for use with DataLoader.

Here we build an example Google Datastore DataLoader using [@google-cloud/datastore](https://cloud.google.com/nodejs/docs/reference/datastore/1.3.x/Datastore).

```js
const DataLoader = require('dataloader');
const Datastore = require('@google-cloud/datastore');

const datastore = new Datastore();

/**
 * Generate a unique string id for each key
 */
function keyToString(key) {
    let id = key.namespace || '';
    id += key.path.join('');
    return id;
}

const datastoreLoader = new DataLoader((keys) => {
    const uuidKeys = keys.map(keyToString);

    const sortEntities = entities => entities.sort((a, b) => (
        uuidKeys.indexOf(keyToString(a[datastore.KEY])) - uuidKeys.indexOf(keyToString(b[datastore.KEY]))
    ));

    return ds.get(keys).then((res) => {
        let entities = res[0];

        if (keys.length > entities.length) {
            /**
             * If the length of the received entities is different from the length
             * of the keys passed, we need to return "null" for the entities not found.
             */

            // Convert the received keys to its string equivalent
            const strIds = entities.map(entity => entity[datastore.KEY]).map(keyToString);
            const length = keys.length;

            for (let i = 0; i < length; i++) {
                /**
                 * If the entities that we got back don't contain one of the
                 * sent from DataLoader, we create a fake entity with
                 * a Symbol with the key.
                 */
                if (strIds.indexOf(uuidKeys[i]) < 0) {
                    const fakeEntity = { __fake__: true };
                    fakeEntity[datastore.KEY] = keys[i];
                    entities.push(fakeEntity);
                }
            }

            // We can now sort the entities and return "null" for the fake ones
            return sortEntities(entities).map(entity => entity.__fake__ ? null : entity);
        }

        if (keys.length === 1) {
            return entities;
        }

        return sortEntities(entities);
    });
}, {
    cacheKeyFn: key => keyToString(key),
});
```

