# npm packages

Folders in this directory are published to npm
in the @bazel/ scoped package.

## Publishing

Run `/scripts/mirror_bazel.sh` to fetch a Bazel release and populate the `bazel-*` packages. The script will also update the `package.json` files and publish to npm.
Similarly, for a release of bazelbuild/buildtools, run the `/scripts/mirror_buildtools.sh` script.

The script relies on the excellent [jq](https://stedolan.github.io/jq) tool, which you'll need to install if you don't have it already.

Login to npm using the `angular` account. The password is shared in http://valentine.

## Adding a new package

When adding a new package, you'll need to add the package explicitly in the following locations:

1. `/.circleci/config.yml`: Add a `build_foobar_package` job for your package and set its dependencies accordingly in the workflow if it depends on another package.
1. `/scripts/packages.sh`: Add your package name to the list of packages to used for scripts.

### Dependencies on other packages

If your package depends on other packages then add the dependency to the `package.json` for your package such as

```
  "devDependencies": {
    "@bazel/foo": "bazel://@npm_bazel_foobar//:npm_package",
    ...
  }
```

and add the following `pretest` script to expand this placeholder for when `yarn_install` is run:

```
  "scripts": {
    "pretest": "../../scripts/link_deps.sh",
    "test": "bazel build ..."
  }
```

### Testing your package

The new package should be automatically tested with `yarn test` in CI by the `test_packages_all.sh` script.

To test your package locally, you can run `yarn test_packages bar`. If you package depends on other packages you must run `yarn build_packages foo` to build a specific dependency or `yarn build_packages_all` to build all dependencies.

### End-to-end tests

Any e2e tests that depend on your package should go under `/e2e`. The `package.json` for your e2e test should link to your package like so:

```
{
  "name": "e2e-foo",
  "dependencies": {
    "@bazel/foo": "bazel://@npm_bazel_foo//:npm_package"
  },
  "scripts": {
    "pretest": "../../scripts/link_deps.sh",
    "test": "bazel test ..."
  }
}
```
