# User managed dependencies

This example shows how to write a simple Node.js program using nodejs rules from source and user managed npm dependencies.

## npm dependencies

In this example, we do the opposite of the `e2e/bazel_managed_deps`. Instead, the dependencies
are managed explicitly by the user. While we typically prefer to have Bazel manage dependencies, this
option could be useful if you vendor the depnedencies into your repository, or use a custom package
manager that's not integrated with Bazel.

`index.js` is the trivial program. You can run it like:

```sh
$ bazel run :example 1
Running program
increment 1 is 2
```

`index.spec.js` is a test. Run it with:

```sh
$ bazel test :test

//:test PASSED in 0.2s

Executed 1 out of 1 test: 1 test passes.
```

## WORKSPACE dependencies from source

When using user managed npm dependencies it is not possible to use the npm to install
Bazel rules from npm packages such as `@bazel/jasmine` or `@bazel/typescript`. Instead, these
dependencies are specified in your WORKSPACE file from source. For example to use the jasmine
rules:

```
load("@bazel_tools//tools/build_defs/repo:http.bzl", "http_archive")
http_archive(
    name = "npm_bazel_jasmine",
    urls = ["https://github.com/bazelbuild/rules_nodejs/archive/0.35.0.tar.gz"],
    strip_prefix = "rules_nodejs-0.35.0/packages/jasmine/src",
    sha256 = "48be6c21d4ee7bf2a6c3dd35ac54f8ff430944b65ab7a43a9cd742f23c9a7279",
)
```

In most cases you will also need the `build_bazel_rules_nodejs` dev dependencies installed
to use the rules from source.

```
load("@build_bazel_rules_nodejs//:package.bzl", "rules_nodejs_dev_dependencies")
rules_nodejs_dev_dependencies()
```
