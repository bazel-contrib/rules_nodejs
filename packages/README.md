# npm packages

Folders in this directory are published to npm
in the @bazel/ scoped package.

## Publishing

Run `mirror.sh` to fetch a Bazel release and populate the `bazel-*` packages. The script will also update the `package.json` files.

The script relies on the excellent [jq](https://stedolan.github.io/jq) tool, which you'll need to install if you don't have it already.

Login to npm using the `angular` account. The password is shared in http://valentine.

Inspect the directories, then `cd` into each of the `bazel*` directories and run `npm publish`.
