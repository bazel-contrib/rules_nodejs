# npm packages

Folders in this directory are published to npm
in the @bazel/ scoped package.

## Publishing

Run `/scripts/mirror_bazel.sh` to fetch a Bazel release and populate the `bazel-*` packages. The script will also update the `package.json` files and publish to npm.
Similarly, for a release of bazelbuild/buildtools, run the `/scripts/mirror_buildtools.sh` script.

The script relies on the excellent [jq](https://stedolan.github.io/jq) tool, which you'll need to install if you don't have it already.

Login to npm using the `angular` account. The password is shared in http://valentine.

## Adding a new package

When adding a new package, you'll need to add the package explicitly to:

1. `/scripts/packages.sh`: Add your package name to the list of packages to used for scripts.
