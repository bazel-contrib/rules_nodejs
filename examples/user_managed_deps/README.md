# User managed dependencies

This example shows how to write a simple Node.js program using nodejs rules from source and user managed npm dependencies.

## npm dependencies

In this example, we do the opposite of the `e2e/bazel_managed_deps`. Instead, the dependencies
are managed explicitly by the user. While we typically prefer to have Bazel manage dependencies, this
option could be useful if you vendor the dependencies into your repository, or use a custom package
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
Bazel rules from npm packages such as `@bazel/jasmine` or `@bazel/typescript`. Instead,
you'll use the rules_nodejs package from sources (the more typical way Bazel rules are used).

This means you'll be exposed to the dev dependencies of rules_nodejs, and will need to load
and call a function in your WORKSPACE file.

```
load("@rules_nodejs//:package.bzl", "rules_nodejs_dev_dependencies")
rules_nodejs_dev_dependencies()
```

You then load rules from the source locations like
`load("@rules_nodejs//packages/jasmine:index.bzl", ...)`
rather than
`load("@npm//@bazel/jasmine:index.bzl", ...)`
