# Binding context to your DataLoaders

Sometimes in your DataLoader loading function you want to access a local context object of some sort, for example a [request context](https://www.apollographql.com/docs/apollo-server/data/resolvers/#the-context-argument) that could contain your database object, the current user, or some per-request telemetry. While not immediately obvious, it's simple to do this, and actually complements the best practice of creating a new DataLoader for each request. Here's how to do it (the example uses Apollo but this works with anything):

```js
function context(args: ExpressContext): Context {
  const context = {
    db: getDB(),
    user: getUserFromSession(args)
  };
  context.loaders = {
    comments: new DataLoader(commentDataloader.bind(context), {
      context: context,
    })
  };
  return context;
}

// Usage (`pg-promise` syntax)

const resolvers = {
  // ...
  posts: {
    comments: (parent: Post, args: Args, context: Context) => {
      return context.loaders.comments.loadMany(parent.comments);
    }
  }
};

export async function commentDataloader(
  this: Context,
  parentIds: readonly number[]
) {
  // Now you can also do fine-grained authorization with `this.user`
  return await this.db.manyOrNone(
    "SELECT * from comment WHERE id IN ($[parentIds:list]) ORDER BY id DESC",
    { parentIds }
  );
}
```
