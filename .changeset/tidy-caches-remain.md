---
'dataloader': patch
---

Preserve replacement cache entries when an older batch fails after a key is cleared and reloaded or primed. Failed requests are still evicted when they own the current cache entry.
