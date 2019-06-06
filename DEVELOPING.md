# For Developers

We strongly encourage you to review the project's scope described in the `README.md` file before working on new features. For large changes, consider writing a design document using [this template](https://goo.gl/YCQttR).

## Testing locally

This repository contains nested workspaces. To test all targets locally in the main workspace and in all nested workspaces run:

```
yarn test_all
```

To do a full clean run:

```
yarn clean_all
```

Other scripts allow you to test all or individual packages, e2e tests and examples. For example,

```
yarn test_packages_all
yarn test_packages typescript karma
yarn test_e2e_all
yarn test_e2e karma
yarn test_examples_all
yarn test_examples webapp
```

## Releasing

Start from a clean checkout at master/HEAD.

Note: if you are using a new clone, you'll need to configure `git-clang-format` to be able to commit the release:

1. `git config clangFormat.binary node_modules/.bin/clang-format`
1. `git config clangFormat.style file`

Check if there are any breaking changes since the last tag - if so, this will be a minor, if not it's a patch.
(This may not sound like semver, but since our major version is a zero, the rule is that minors are breaking changes and patches are new features.)

1. `yarn install`
1. Re-generate the API docs: `yarn skydoc`
1. `git add docs/` (in case new files were created)
1. `git commit -a -m 'docs: update docs for release'`
1. `npm config set tag-version-prefix ''` (we don't put a "v" prefix on our tags)
1. `npm version minor -m 'chore: release %s'` (replace `minor` with `patch` if no breaking changes)
1. Build npm packages and publish them: `./scripts/publish_release.sh`
1. `git push upstream && git push upstream --tags`
1. (Manual for now): go to the [releases] page, edit the release with rough changelog (especially note any breaking changes!) and upload the release artifact from `rules_nodejs-[version].tar.gz` 
1. Announce the release on Angular slack in `#tools-abc-discuss`

[releases]: https://github.com/bazelbuild/rules_nodejs/releases
