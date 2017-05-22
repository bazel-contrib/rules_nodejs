# TypeScript rules for Bazel

**WARNING: this is an early release with limited features. Breaking changes are likely. Not recommended for general use.**

The TypeScript rules integrate the TypeScript compiler with Bazel.

## Installation

First, install a current Bazel distribution.

Create a `BUILD` file in your project root:

```python
package(default_visibility = ["//visibility:public"])
exports_files(["tsconfig.json"])

# NOTE: this will move to node_modules/BUILD in a later release
filegroup(name = "node_modules", srcs = glob(["node_modules/**/*"]))
```

> Note, on Mac file paths are case-insensitive, so make sure there isn't already
a `build` folder in the project root.

Next create a `WORKSPACE` file in your project root (or edit the existing one)
containing:

```python
load("@bazel_tools//tools/build_defs/repo:git.bzl", "git_repository")

git_repository(
    name = "io_bazel_rules_typescript",
    remote = "https://github.com/bazelbuild/rules_typescript.git",
    tag = "0.0.1",
)

load("@io_bazel_rules_typescript//:defs.bzl", "node_repositories", "yarn_install")

node_repositories()
yarn_install(package_json = "//:package.json")

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

(Note that you may want to name the ts_library target the same as the enclosing
directory, making it the default target in the package.)

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
