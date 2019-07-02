# @bazel/hide-bazel-files

A tool to hide Bazel files that may be shipped with some npm packages. Packages with these files cause build failures when used with `npm_install` or `yarn_install`.

This tool renames all `BUILD` and `BUILD.bazel` files under node_modules to `_BUILD` and `_BUILD.bazel` respectively.

If you see an error such as

```
ERROR: /private/var/tmp/_bazel_greg/37b273501bbecefcf5ce4f3afcd7c47a/external/npm/BUILD.bazel:9:1: Label '@npm//:node_modules/rxjs/src/AsyncSubject.ts' crosses boundary of subpackage '@npm//node_modules/rxjs/src' (perhaps you meant to put the colon here: '@npm//node_modules/rxjs/src:AsyncSubject.ts'?)
```

then chances are there is an npm package in your dependencies that contains a `BUILD` file. To resolve this, add `@bazel/hide-bazel-files` to your `devDependencies`. The `@bazel/hide-bazel-files` npm package automatically runs a postinstall step that renames all Bazel build files in your node_modules.

```
"devDependencies": {
  "@bazel/hide-bazel-files": "latest"
},
```

Note: The commonly used npm package rxjs contains `BUILD` files from version 5.5.5 to 6.4.0 inclusive. These have now been removed in version 6.5.0. If you are using an rxjs version in that range and that is the only npm package in your dependencies that contains `BUILD` files then you can try upgrading to rxjs 6.4.0 instead of using `hide-bazel-files`.
