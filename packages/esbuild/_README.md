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

Add an `http_archive` fetching the esbuild binary for each platform that you need to support. 

```python
_ESBUILD_VERSION = "0.11.6"  # reminder: update SHAs below when changing this value
http_archive(
    name = "esbuild_darwin",
    urls = [
        "https://registry.npmjs.org/esbuild-darwin-64/-/esbuild-darwin-64-%s.tgz" % _ESBUILD_VERSION,
    ],
    strip_prefix = "package",
    build_file_content = """exports_files(["bin/esbuild"])""",
    sha256 = "2b06365b075b854654fc9ed26fcd48a0c38947e1c8d5151ce400cd1e173bb138",
)

http_archive(
    name = "esbuild_windows",
    urls = [
        "https://registry.npmjs.org/esbuild-windows-64/-/esbuild-windows-64-%s.tgz" % _ESBUILD_VERSION,
    ],
    strip_prefix = "package",
    build_file_content = """exports_files(["esbuild.exe"])""",
    sha256 = "ddab1121833f0a12ca4fb3e288231e058f5526310671e84c0a9aa575340bb20b",
)

http_archive(
    name = "esbuild_linux",
    urls = [
        "https://registry.npmjs.org/esbuild-linux-64/-/esbuild-linux-64-%s.tgz" % _ESBUILD_VERSION,
    ],
    strip_prefix = "package",
    build_file_content = """exports_files(["bin/esbuild"])""",
    sha256 = "34612e3e15e6c31d9d742d3fd677bd5208b7e5c0ee9c93809999138c6c5c1039",
)
```

These can then be referenced on the `tool` attribute of the `esbuild` rule. 

```python
esbuild(
    name = "bundle",
    ...
    tool = select({
        "@bazel_tools//src/conditions:darwin": "@esbuild_darwin//:bin/esbuild",
        "@bazel_tools//src/conditions:windows": "@esbuild_windows//:esbuild.exe",
        "@bazel_tools//src/conditions:linux_x86_64": "@esbuild_linux//:bin/esbuild",
    }),
)
```

It might be useful to wrap this locally in a macro for better reuseability, see `packages/esbuild/test/tests.bzl` for an example.

The `esbuild` rule can take a JS or TS dependency tree and bundle it to a single file, or split across multiple files, outputting a directory. 

```python
load("//packages/esbuild:index.bzl", "esbuild")
load("//packages/typescript:index.bzl", "ts_library")

ts_library(
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
load("//packages/typescript:index.bzl", "ts_library")

ts_library(
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
