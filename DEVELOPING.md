# For Developers

We strongly encourage you to review the project's scope described in the `README.md` file before working on new features. For large changes, consider writing a design document using [this template](https://goo.gl/YCQttR).

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
1. `git commit -a -m 'Update docs for release'`
1. `npm config set tag-version-prefix ''` (we don't put a "v" prefix on our tags)
1. `npm version minor -m 'rel: %s'` (replace `minor` with `patch` if no breaking changes)
1. `git push upstream && git push upstream --tags`
1. Build npm packages and publish them: TMP=$(mktemp -d -t bazel-release.XXXXXXX); ( cd packages/jasmine && bazel --output_base=$TMP run  --workspace_status_command=../../tools/current_version.sh //:package.publish )
1. (Manual for now): go to the [releases] page, edit the release with rough changelog (especially note any breaking changes!) and upload the release artifact from `rules_nodejs-[version].tar.gz` 
1. Announce the release on Angular slack in `#tools-abc-discuss`

[releases]: https://github.com/bazelbuild/rules_nodejs/releases
