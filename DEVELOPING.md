# For Developers

After cloning the repo, run `pre-commit install` so that your commits are automatically formatted for you. Otherwise you'll get yelled at later by our CI.

> See https://pre-commit.com/#installation if you don't have `pre-commit` installed.

It's a lot of work for us to review and accept Pull Requests. Sometimes things can't merge simply because it's too hard to determine if you change is breaking something else, or because the system you're touching is already being refactored by someone else. Before working on new features, we strongly encourage you to review the project's scope described in the `README.md` file. For large changes, consider writing a design document using [this template](https://goo.gl/YCQttR).

## Architecture

Unlike some other Bazel rules, these rules require a separate build step, and
can not be used by just pointing your workspace file at this git repo without
[some extra work](./examples/from_source/).

When you run 'bazel build release', the core parts of these rules will be
bundled up into dist/bin/release.tar.gz, and that file can be used in your own
workspace by adding something like the following to your workspace file:

    http_archive(
        name = "build_bazel_rules_nodejs",
        urls = [
            "file:///tmp/release.tar.gz",
        ],
    )

The various submodules in packages/ are not included in release.tar.gz. Most of
them contain their own package.json, and they are designed to function like
normal npm packages. In the release process, each submodule gets bundled up into
an npm package, and uploaded to npm as `@bazel/[name]`. End users then add the
desired packages to their own package.json file to use them.

If you run bazel build packages/..., you can then see the resulting npm package
by looking in, eg, dist/bin/packages/concatjs/npm_package.

This separate packaging means that package paths differ between usage inside
this repo, and usage by end users. A //packages/something:foo.bzl path needs to be
mapped to @bazel/something:foo.bzl, and these modifications are taken care of
by a substitutions= argument to pkg_npm() in each package's BUILD.bazel file.

## In-repo tests

A number of tests in this repo are designed to function with local repository
paths, meaning they can be run directly, and are faster to execute. The `yarn
test` command is a shortcut to exclude integration tests, eg

    yarn test //...

or

    yarn test //packages/...

## Integration tests

In order to test that the rules work outside of this repo, this repo uses bazel-in-bazel with the
bazel_integration_test rule to set up an environment with the package paths matching what end users
will see. The end-to-end tests in e2e, and examples are built this way.

The integration tests must be run in series, as they use up too many resources when run in parallel.

`bazel test ...` includes all these integration tests. If you wish to exclude some of them, see the output of
`yarn test` in the previous section.

When running the e2e tests, it is recommended to tune the memory usage of Bazel locally. This can be done with `bazel --host_jvm_args=-Xms256m --host_jvm_args=-Xmx1280m test ... --test_tag_filters=e2e --local_ram_resources=792 --test_arg=--local_ram_resources=13288`. A shortcut for this is `yarn test_e2e //...`.

Similarly, for test examples run `bazel --host_jvm_args=-Xms256m --host_jvm_args=-Xmx1280m test ... --test_tag_filters=examples --local_ram_resources=792 --test_arg=--local_ram_resources=13288`. A shortcut for this is `yarn test_examples //...`.

To test all targets locally in the main workspace and in all nested workspaces run:

```
yarn test_all
```

To do a full clean run:

```
yarn clean_all
```

## Debugging

See [this page](./docs/debugging.md).

## Patching

For small changes, you may find it easier to [patch the standard
rules](./docs/changing-rules.md) instead of building your own release products.

## Releasing

Start from a clean checkout at master/HEAD.

Googlers: you should npm login using the go/npm-publish service: `$ npm login --registry https://wombat-dressing-room.appspot.com`

Check if there are any breaking changes since the last tag - if so, this will be a major. Check if there were new features added since the last tag - if so, this will be a minor.

1. Re-generate the API docs: `yarn stardoc`
1. `git add docs/` (in case new files were created)
1. `git commit -a -m 'docs: update docs for release'`
1. `npm version [major|minor|patch]` (`major` if there are breaking changes, `minor` if there are new features, otherwise `patch`)
1. Manually update the CHANGELOG.md based on the commits since the last release. Look for breaking changes that weren't documented.
1. If publishing from inside Google, set NPM_REGISTRY="--registry https://wombat-dressing-room.appspot.com" in your environment
1. Build npm packages and publish them: `./scripts/publish_release.sh` (for a release candidate, add arguments `publish next`)
1. Run `./scripts/update_nested_lock_files.sh` to update the lock files in all nested workspaces to new release
1. `git commit -a -m 'chore: update lock files for release'`
1. `git push upstream && git push upstream --tags`
1. (Manual for now): go to the [releases] page, edit the release with rough changelog (especially note any breaking changes!) and upload the release artifact from `rules_nodejs-[version].tar.gz`. Also copy the release notes from CHANGELOG.md
1. Announce the release on Bazel slack in `#javascript`

[releases]: https://github.com/bazelbuild/rules_nodejs/releases
