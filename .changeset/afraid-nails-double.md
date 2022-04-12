---
"dataloader": minor
---

- Do not return void results from arrow functions https://github.com/graphql/dataloader/commit/3b0bae94e91453d9a432c02628745252abc5e011
- Fix typo in `loader.load()` error message https://github.com/graphql/dataloader/commit/249b2b966a8807c50e07746ff04acb8c48fa4357
- Fix typo in SQL example https://github.com/graphql/dataloader/commit/cae1a3d9bfa48e181a49fd443f43813b335dc120
- Fix typo in TypeScript declaration https://github.com/graphql/dataloader/commit/ef6d32f97cde16aba84d96dc806c4439eaf8efae
- Most of the browsers don't have `setImmediate`. `setImmediate || setTimeout` doesn't work and it throws `setImmediate` is not defined in this case, so we should check setImmediate with typeof. And some environments like Cloudflare Workers don't allow you to set setTimeout directly to another variable. https://github.com/graphql/dataloader/commit/3e62fbe7d42b7ab1ec54818a1491cb0107dd828a
