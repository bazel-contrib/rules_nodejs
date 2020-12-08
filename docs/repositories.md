---
title: Generated Repositories
layout: default
toc: true
---
# Generated Repositories

rules_nodejs produces several repositories for you to reference.
Bazel represents your workspace as one repository, and code fetched or installed from outside your workspace lives in other repositories.
These are referenced with the `@repo//` syntax in your BUILD files.

## @nodejs

This repository is created by calling the `node_repositories` function in your `WORKSPACE` file.
It contains the node, npm, and yarn programs.

As always, `bazel query` is useful for learning about what targets are available.

```sh
$ bazel query @nodejs//...
@nodejs//:node
...
```

You don't typically need to reference the `@nodejs` repository from your BUILD files because it's used behind the scenes
to run node and fetch dependencies.

Some ways you can use this:

- Run the Bazel-managed version of node: `bazel run @nodejs//:node path/to/program.js`
- Run the Bazel-managed version of npm: `bazel run @nodejs//:npm`
- Run the Bazel-managed version of yarn: `bazel run @nodejs//:yarn`
- Install dependencies from nested package.json file(s) which were passed to `node_repositories#package.json`
  - using npm: `bazel run @nodejs//:npm_node_repositories install`
  - using yarn: `bazel run @nodejs//:yarn_node_repositories`

## @npm

This repository is created by calling the `npm_install` or `yarn_install` function in your `WORKSPACE` file.

The name `@npm` is recommended in the simple case that you install only a single `package.json` file.
If you have multiple, call the `npm_install` or `yarn_install` multiple times, and give each one a unique name.
This results in multiple repositories, named whatever you chose, rather than "npm".
The following applies to any repository created by `npm_install` , or `yarn_install`, just replace `@npm` with the name you chose.

Again, use `bazel query @npm//...` to learn about all the targets declared in this repository.

Our philosophy is to mirror the installed npm dependencies in a way that's idiomatic to reference them in Bazel.

Commonly used ones are:

- Every file that was installed from npm: `@npm//:node_modules`. This target can have a very large number of files and slow down your build, however it's a simple way to skip having to declare more fine-grained inputs to your BUILD targets.
- If you had a dependency on the `foo` package, you can reference `@npm//foo` to get all the files. We mirror the npm dependency graph, so if `foo` declares a dependency on another package `dep`, Bazel will include that dependency when `foo` is used.
- If the `foo` package has an executable program `bar`, then `@npm//foo/bin:bar` is a `nodejs_binary` that you can call with `bazel run` or can pass as the `executable` to your own rules.
- Sometimes you need a UMD bundle, but a package doesn't ship one. For example, the `ts_devserver` rule depends on third-party libraries having a named UMD entry point. The `@npm//foo:foo__umd` target will automatically run Browserify to convert the package's `main` entry into UMD.

> One convenient (maybe also confusing) way to understand what BUILD files are generated is to look at our integration test at https://github.com/bazelbuild/rules_nodejs/tree/stable/internal/npm_install/test/golden - this directory looks similar to the content of an `@npm` repository.

## Generated macros for npm packages with `bin` entries

Any installed package that has one or more `bin` entries in the package.json get convenient macros generated.
These are the Bazel equivalent of the `./node_modules/.bin/*` files in your project which the package manager created.

For a package `foo` with some bin entries, we will create a `.bzl` file where you can load rules, at `@npm//foo:index.bzl`

If the foo package contains a bin entry `bar`, the `index.bzl` file will contain `bar` and `bar_test` macros. You can load these two generated rules in your BUILD file:

`load("@npm//foo:index.bzl", "bar", "bar_test")`

The `bar` macro can be called in two ways. If you pass `outs` or `output_dir`, it produces an `npm_package_bin` rule that invokes the tool to transform some inputs to outputs, useful as a dependency of another rule, or with `bazel build`. If you don't pass `outs` or `output_dir`, then it will produce a `nodejs_binary` rule intended for use with `bazel run`. (The latter is identical to the `@npm//foo/bin:bar` target, just giving you a convenient way to alias it with a different label and pass it arguments).

See examples in rules_nodejs. A typical tool to use with `outs` is Babel, while a typical rule with no outputs is `http_server`.

The `bar_test` macro produces a `nodejs_test` that assumes the tool is a test runner, and produces a zero or one exit code, useful as a target with `bazel test`. See the examples of `mocha_test` in rules_nodejs.

You can also read https://dev.to/bazel/layering-in-bazel-for-web-389h to see an end-to-end example of using the generated `bin` macros.
