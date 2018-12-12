# For Developers

We strongly encourage you to review the project's scope described in the `README.md` file before working on new features. For large changes, consider writing a design document using [this template](https://goo.gl/YCQttR).

## Releasing

Start from a clean checkout at master/HEAD.
Check if there are any breaking changes since the last tag - if so, this will be a minor, if not it's a patch.
(This may not sound like semver, but since our major version is a zero, the rule is that minors are breaking changes and patches are new features.)

1. Re-generate the API docs: `yarn skydoc`
1. `git add docs/` (in case new files were created)
1. `git commit -a -m 'Update docs for release'`
1. `npm config set tag-version-prefix ''`
1. `npm version minor -m 'rel: %s'` (replace `minor` with `patch` if no breaking changes)
1. `git push upstream && git push upstream --tags`

