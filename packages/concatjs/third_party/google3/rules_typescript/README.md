# TypeScript rules for Bazel

**WARNING: this is an early release with limited features. Breaking changes are likely. Not recommended for general use.**

The TypeScript rules integrate the TypeScript compiler with Bazel.

## Installation

First, install a current Bazel distribution.

Create a `BUILD.bazel` file in your project root:

```python
package(default_visibility = ["//visibility:public"])
exports_files(["tsconfig.json"])

# NOTE: this will move to node_modules/BUILD in a later release
filegroup(name = "node_modules", srcs = glob(["node_modules/**/*"]))
```

Next create a `WORKSPACE` file in your project root (or edit the existing one)
containing:

```python
load("@bazel_tools//tools/build_defs/repo:git.bzl", "git_repository")

git_repository(
    name = "io_bazel_rules_typescript",
    remote = "https://github.com/bazelbuild/rules_typescript.git",
    tag = "0.0.3", # check for the latest tag when you install
)

load("@io_bazel_rules_typescript//:defs.bzl", "node_repositories")

node_repositories(package_json = "//:package.json")
```

We recommend using the Yarn package manager, because it has a built-in command
to verify the integrity of your `node_modules` directory.
You can run the version Bazel has already installed:

```sh
$ bazel run @yarn//:yarn
```

## Usage

Currently, the only available rule is `ts_library` which invokes the TypeScript
compiler on one compilation unit (generally one directory of source files).

Create a `BUILD` file next to your sources:

```
package(default_visibility=["//visibility:public"])
load("@io_bazel_rules_typescript//:defs.bzl", "ts_library")

ts_library(
    name = "my_code",
    srcs = glob(["*.ts"]),
    deps = ["//path/to/other:library"],
    tsconfig = "//:tsconfig.json",
)
```

Then build it:

`bazel build //path/to/package:target`

The resulting `.d.ts` file paths will be printed. Additionally, the `.js`
outputs from TypeScript will be written to disk, next to the `.d.ts` files.

## Notes

If you'd like a "watch mode", try https://github.com/bazelbuild/bazel-watcher
(note, it's also quite new).

At some point, we plan to release a tool similar to [gazelle] to generate the
BUILD files from your source code.

[gazelle]: https://github.com/bazelbuild/rules_go/tree/master/go/tools/gazelle

