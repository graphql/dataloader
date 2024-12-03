# Contributing to DataLoader

We want to make contributing to this project as easy and transparent as
possible.

## Code of Conduct

This project's code of conduct is described in the GraphQL Foundation's [`CODE_OF_CONDUCT.md`](https://github.com/graphql/foundation/blob/master/CODE-OF-CONDUCT.md)

## Pull Requests

We actively welcome your pull requests for documentation and code.

1. Fork the repo and create your branch from `master`.
2. If you've added code that should be tested, add tests with 100% coverage.
3. If you've changed APIs, update the documentation.
4. Ensure the test suite passes.
5. Make sure your code lints.
6. If you haven't already, complete the Contributor License Agreement ("CLA").
7. Run `yarn changeset` and describe the change you're proposing. Commit the file it creates in `.changeset` to the repo. [You can read more about changeset here.](https://github.com/changesets/changesets)
8. Open a Pull Request so we can review and incorporate your change.

## Releases

To release a new version:
1. Run `yarn changeset version` to bump the version of the package.
2. Run `yarn release` this will create a new release on GitHub and publish the package to NPM. 

## Issues

We use GitHub issues to track public bugs. Please ensure your description is
clear and has sufficient instructions to be able to reproduce the issue.

## Coding Style

- 2 spaces for indentation rather than tabs
- 80 character line length
- See .eslintrc for the gory details.

## License

By contributing to DataLoader, you agree that your contributions will be
licensed under its MIT license.
