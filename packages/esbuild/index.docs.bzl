"""
# esbuild rules for Bazel

The esbuild rules runs the [esbuild](https://github.com/evanw/esbuild) bundler tool with Bazel.
esbuild is an extremely fast JavaScript bundler written in Go, its [current benchmarks](https://esbuild.github.io/faq/#benchmark-details) show it can be 320x faster that other bundlers

## Installation

Add the `@bazel/esbuild` npm packages to your `devDependencies` in `package.json`.

```
npm install --save-dev @bazel/esbuild
```
or using yarn
```
yarn add -D @bazel/esbuild
```

The esbuild binary is fetched from npm automatically and exposed via toolchains. Add the `esbuild_repositories` rule to the `WORKSPACE`:

```python
load("@npm//@bazel/esbuild:esbuild_repositories.bzl", "esbuild_repositories")

esbuild_repositories()
```

As esbuild is being fetched from `npm`, the load statement above can cause eager fetches of the `@npm` external repository.
To work around this, it's possible to fetch the `@bazel/esbuild` package via an `http_archive`

```python
http_archive(
    name = "bazel_esbuild",
    urls = [
        "https://registry.npmjs.org/@bazel/esbuild/-/esbuild-4.0.0.tgz",
    ],
    strip_prefix = "package",
)

load("@bazel_esbuild//:esbuild_repositories.bzl", "esbuild_repositories")

esbuild_repositories()
```

## Overview

The `esbuild` rule can take a JS or TS dependency tree and bundle it to a single file, or split across multiple files, outputting a directory. 

```python
load("//packages/esbuild:index.bzl", "esbuild")
load("//packages/typescript:index.bzl", "ts_project")

ts_project(
    name = "lib",
    srcs = ["a.ts"],
)

esbuild(
    name = "bundle",
    entry_point = "a.ts",
    deps = [":lib"],
)
```

The above will create three output files, `bundle.js`, `bundle.js.map` and `bundle_metadata.json` which contains the bundle metadata to aid in debugging and resoloution tracing.

To create a code split bundle, set `splitting = True` on the `esbuild` rule.

```python
load("//packages/esbuild:index.bzl", "esbuild")
load("//packages/typescript:index.bzl", "ts_project")

ts_project(
    name = "lib",
    srcs = ["a.ts"],
    deps = [
        "@npm//foo",
    ],
)

esbuild(
    name = "bundle",
    entry_point = "a.ts",
    deps = [":lib"],
    splitting = True,
)
```

This will create an output directory containing all the code split chunks, along with their sourcemaps files
"""

load(
    "@build_bazel_rules_nodejs//packages/esbuild:esbuild.bzl",
    _esbuild = "esbuild",
)
load(
    "@build_bazel_rules_nodejs//packages/esbuild:esbuild_repositories.bzl",
    _esbuild_repositories = "esbuild_repositories",
)
load(
    "@build_bazel_rules_nodejs//packages/esbuild/toolchain:toolchain.bzl",
    _configure_esbuild_toolchain = "configure_esbuild_toolchain",
)

esbuild = _esbuild
esbuild_repositories = _esbuild_repositories
configure_esbuild_toolchain = _configure_esbuild_toolchain
