# Using DataLoader with Cloud Firestore

Cloud Firestore is a "NoSQL" document-oriented database which supports [in operator](https://firebase.google.com/docs/firestore/query-data/queries#in_not-in_and_array-contains-any),
making it can be used with DataLoader.

Here we build an example Cloud Firestore DataLoader using [firebase-admin](https://firebase.google.com/docs/admin/setup?hl=en).

```js
const admin = require("firebase-admin");

admin.initializeApp({
  // You need to Initialize the SDK
});

const datastoreLoader = new DataLoader(
  async (keys) => {
    const snapshot = await admin
      .firestore()
      .collection(`users`)
      .where(admin.firestore.FieldPath.documentId(), `in`, keys)
      .get();
    return snapshot.docs.map((doc) => ({ ...doc.data(), id: doc.id }));
  },
  {
    // The in clause of Cloud Firestore is support up to 10 comparison values
    maxBatchSize: 10,
  }
);
```
