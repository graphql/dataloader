---
"dataloader": patch
---

Fix the propagation of sync throws in the batch function to the loader function instead of crashing the process wtih an uncaught exception.
