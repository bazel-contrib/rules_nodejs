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

Add an `http_archive` fetching the esbuild binary for each platform that you need to support. 

```python
_ESBUILD_VERSION = "0.11.14"  # reminder: update SHAs below when changing this value
http_archive(
    name = "esbuild_darwin",
    urls = [
        "https://registry.npmjs.org/esbuild-darwin-64/-/esbuild-darwin-64-%s.tgz" % _ESBUILD_VERSION,
    ],
    strip_prefix = "package",
    build_file_content = \"""exports_files(["bin/esbuild"])\""",
    sha256 = "81c8623c4c03a1fc449c37a90dd630025e334d312420d42106a899f78bd5e3fe",
)

http_archive(
    name = "esbuild_windows",
    urls = [
        "https://registry.npmjs.org/esbuild-windows-64/-/esbuild-windows-64-%s.tgz" % _ESBUILD_VERSION,
    ],
    strip_prefix = "package",
    build_file_content = \"""exports_files(["esbuild.exe"])\""",
    sha256 = "d977751550550099cb9deb95d3fc436c21374b3875131589dde162dfb1c03bf4",
)

http_archive(
    name = "esbuild_linux",
    urls = [
        "https://registry.npmjs.org/esbuild-linux-64/-/esbuild-linux-64-%s.tgz" % _ESBUILD_VERSION,
    ],
    strip_prefix = "package",
    build_file_content = \"""exports_files(["bin/esbuild"])\""",
    sha256 = "fbf8d42fbd12d2392893a5d8cea3860e875c47ee715660e844dff822b8747321",
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
"""

load(
    "@build_bazel_rules_nodejs//packages/esbuild:esbuild.bzl",
    _esbuild = "esbuild",
)

esbuild = _esbuild

# DO NOT ADD MORE rules here unless they appear in the generated docsite.
# Run yarn stardoc to re-generate the docsite.
