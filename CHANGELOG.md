# dataloader

## 2.2.3

### Patch Changes

- [#342](https://github.com/graphql/dataloader/pull/342) [`38fedd4`](https://github.com/graphql/dataloader/commit/38fedd4106e9e3e7eb77bd68e42abc088110bd43) Thanks [@abendi](https://github.com/abendi)! - Ensure `cacheKeyFn` is not called when caching is disabled, since the key is not utilized in that case.

## 2.2.2

### Patch Changes

- [#334](https://github.com/graphql/dataloader/pull/334) [`e286f66`](https://github.com/graphql/dataloader/commit/e286f662657675fa790f33abcd6aa87b5aac2be3) Thanks [@henrinormak](https://github.com/henrinormak)! - Added missing type definition for Dataloader.name

## 2.2.1

### Patch Changes

- [#331](https://github.com/graphql/dataloader/pull/331) [`6d2efb7`](https://github.com/graphql/dataloader/commit/6d2efb7dd0363062de255e723c29a781d0ea9937) Thanks [@saihaj](https://github.com/saihaj)! - `name` is an optional property

## 2.2.0

### Minor Changes

- [#326](https://github.com/graphql/dataloader/pull/326) [`6c758d0`](https://github.com/graphql/dataloader/commit/6c758d03bef628a69b238f053da3b263cd5e3321) Thanks [@SimenB](https://github.com/SimenB)! - Add `name` property to `DataLoader`. Useful in APM tools.

### Patch Changes

- [#318](https://github.com/graphql/dataloader/pull/318) [`588a8b6`](https://github.com/graphql/dataloader/commit/588a8b6c6391aad042b369f10dc440c7e0458312) Thanks [@boopathi](https://github.com/boopathi)! - Fix the propagation of sync throws in the batch function to the loader function instead of crashing the process wtih an uncaught exception.

* [#252](https://github.com/graphql/dataloader/pull/252) [`fae38f1`](https://github.com/graphql/dataloader/commit/fae38f14702e925d1e59051d7e5cb3a9a78bfde8) Thanks [@LinusU](https://github.com/LinusU)! - Fix types for priming cache with promise

- [#321](https://github.com/graphql/dataloader/pull/321) [`3cd3a43`](https://github.com/graphql/dataloader/commit/3cd3a430bdb4f9ef2f7f265a29e93e0255277885) Thanks [@thekevinbrown](https://github.com/thekevinbrown)! - Resolves an issue where the maxBatchSize parameter wouldn't be fully used on each batch sent to the backend loader.

## 2.1.0

### Minor Changes

- 28cf959: - Do not return void results from arrow functions https://github.com/graphql/dataloader/commit/3b0bae94e91453d9a432c02628745252abc5e011
  - Fix typo in `loader.load()` error message https://github.com/graphql/dataloader/commit/249b2b966a8807c50e07746ff04acb8c48fa4357
  - Fix typo in SQL example https://github.com/graphql/dataloader/commit/cae1a3d9bfa48e181a49fd443f43813b335dc120
  - Fix typo in TypeScript declaration https://github.com/graphql/dataloader/commit/ef6d32f97cde16aba84d96dc806c4439eaf8efae
  - Most of the browsers don't have `setImmediate`. `setImmediate || setTimeout` doesn't work and it throws `setImmediate` is not defined in this case, so we should check setImmediate with typeof. And some environments like Cloudflare Workers don't allow you to set setTimeout directly to another variable. https://github.com/graphql/dataloader/commit/3e62fbe7d42b7ab1ec54818a1491cb0107dd828a

### Patch Changes

- 3135e9a: Fix typo in jsdoc comment; flip "objects are keys" to "keys are objects"
