# For Developers

We strongly encourage you to review the project's scope described in the `README.md` file before working on new features. For large changes, consider writing a design document using [this template](https://goo.gl/YCQttR).

### Releasing

Start from a clean checkout at master/HEAD. Check if there are any breaking
changes since the last tag - if so, this will be a minor, if not, it's a patch.
(This may not sound like semver - but since our major version is a zero, the
rule is that minors are breaking changes and patches are new features).

1. Re-generate the API docs: `yarn skydoc`
1. May be necessary if Go code has changed though probably it was already necessary to run this to keep CI green: `bazel run :gazelle`
1. If we depend on a newer rules_nodejs, update the `check_rules_nodejs_version` in `ts_repositories.bzl`
1. `git commit -a -m 'Update docs for release'`
1. `npm config set tag-version-prefix ''`
1. `npm version minor -m 'rel: %s'` (replace `minor` with `patch` if no breaking changes)
1. Build npm packages and publish them: `bazel run //internal:npm_package.publish && bazel run //internal/karma:npm_package.publish`
1. `bazel build :release`
1. `git push && git push --tags`
1. (Manual for now) go to the [releases] page, edit the new release, and attach the `bazel-bin/release.tgz` file
1. (Temporary): submit a google3 CL to update the versions in package.bzl and package.json

[releases]: https://github.com/bazelbuild/rules_typescript/releases

