---
'dataloader': patch
---

Ensure `cacheKeyFn` is not called when caching is disabled, since the key is not utilized in that case.
