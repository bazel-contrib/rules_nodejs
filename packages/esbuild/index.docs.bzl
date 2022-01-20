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

The esbuild binary is fetched automatically for your platform and is exposed via Bazel toolchains.
To do this, add the `esbuild_repositories` rule to your `WORKSPACE`.
You'll need to point it to the repository created by npm_install or yarn_install where the `@bazel/esbuild`
package is fetched. (Typically, this is `npm`).
Set the `npm_repository` attribute to the name of that repository.

```python
npm_install(
    name = "npm",
    # @bazel/esbuild is a dependency in this package.json
    package_json = "//:package.json",
    package_lock_json = "//:package-lock.json",
)

load("@build_bazel_rules_nodejs//toolchains/esbuild:esbuild_repositories.bzl", "esbuild_repositories")

esbuild_repositories(npm_repository = "npm")
```

> To avoid eagerly fetching all the npm dependencies, this load statement comes from the "Built-in"
> `@build_bazel_rules_nodejs` repository rather than from `@npm`.
> In rules_nodejs 5.0 we intend to fix this layering violation by having the whole esbuild support
> distributed independently of rules_nodejs, and not require any package to be installed from npm.

See the API docs for `esbuild_repositories` for ways to customize how Bazel downloads the esbuild package
from npm. Alternatively, advanced users can override the download altogether by defining the esbuild repository
earlier in your WORKSPACE file, so that the `maybe` inside `esbuild_repositories` is skipped.

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
    "@build_bazel_rules_nodejs//packages/esbuild:esbuild_config.bzl",
    _esbuild_config = "esbuild_config",
)
load(
    "@build_bazel_rules_nodejs//toolchains/esbuild:esbuild_repositories.bzl",
    _esbuild_repositories = "esbuild_repositories",
)
load(
    "@build_bazel_rules_nodejs//toolchains/esbuild:toolchain.bzl",
    _configure_esbuild_toolchain = "configure_esbuild_toolchain",
)

esbuild = _esbuild
esbuild_config = _esbuild_config
esbuild_repositories = _esbuild_repositories
configure_esbuild_toolchain = _configure_esbuild_toolchain
