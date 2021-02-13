<!-- *********************
title: esbuild
toc: true
nav: rule
********************* -->
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
_ESBUILD_VERSION = "0.8.48"  # reminder: update SHAs below when changing this value
http_archive(
    name = "esbuild_darwin",
    urls = [
        "https://registry.npmjs.org/esbuild-darwin-64/-/esbuild-darwin-64-%s.tgz" % _ESBUILD_VERSION,
    ],
    strip_prefix = "package",
    build_file_content = """exports_files(["bin/esbuild"])""",
    sha256 = "d21a722873ed24586f071973b77223553fca466946f3d7e3976eeaccb14424e6",
)

http_archive(
    name = "esbuild_windows",
    urls = [
        "https://registry.npmjs.org/esbuild-windows-64/-/esbuild-windows-64-%s.tgz" % _ESBUILD_VERSION,
    ],
    strip_prefix = "package",
    build_file_content = """exports_files(["esbuild.exe"])""",
    sha256 = "fe5dcb97b4c47f9567012f0a45c19c655f3d2e0d76932f6dd12715dbebbd6eb0",
)

http_archive(
    name = "esbuild_linux",
    urls = [
        "https://registry.npmjs.org/esbuild-linux-64/-/esbuild-linux-64-%s.tgz" % _ESBUILD_VERSION,
    ],
    strip_prefix = "package",
    build_file_content = """exports_files(["bin/esbuild"])""",
    sha256 = "60dabe141e5dfcf99e7113bded6012868132068a582a102b258fb7b1cfdac14b",
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



## esbuild
Runs the esbuild bundler under Bazel

For further information about esbuild, see https://esbuild.github.io/
    


#### Attributes


##### .attribute name (required)


###### .attribute-type Name
A unique name for this target.


##### .attribute args


###### .attribute-type String List
A list of extra arguments that are included in the call to esbuild


##### .attribute define


###### .attribute-type String List
A list of global identifier replacements.
Example:
```python
esbuild(
    name = "bundle",
    define = [
        "process.env.NODE_ENV=\"production\""
    ],
)
```

See https://esbuild.github.io/api/#define for more details
            


##### .attribute deps


###### .attribute-type Label List
A list of direct dependencies that are required to build the bundle


##### .attribute entry_point (required)


###### .attribute-type Label
The bundle's entry point (e.g. your main.js or app.js or index.js)


##### .attribute external


###### .attribute-type String List
A list of module names that are treated as external and not included in the resulting bundle

See https://esbuild.github.io/api/#external for more details
            


##### .attribute format


###### .attribute-type String
The output format of the bundle, defaults to iife when platform is browser
and cjs when platform is node. If performing code splitting, defaults to esm.

See https://esbuild.github.io/api/#format for more details
        


##### .attribute link_workspace_root


###### .attribute-type Boolean
Link the workspace root to the bin_dir to support absolute requires like 'my_wksp/path/to/file'.
    If source files need to be required then they can be copied to the bin_dir with copy_to_bin.


##### .attribute max_threads


###### .attribute-type Int
Sets the `GOMAXPROCS` variable to limit the number of threads that esbuild can run with.
This can be useful if running many esbuild rule invocations in parallel, which has the potential to cause slowdown.
For general use, leave this attribute unset.
            


##### .attribute minify


###### .attribute-type Boolean
Minifies the bundle with the built in minification.
Removes whitespace, shortens identifieres and uses equivalent but shorter syntax.

Sets all --minify-* flags

See https://esbuild.github.io/api/#minify for more details
            


##### .attribute output


###### .attribute-type Output
Name of the output file when bundling


##### .attribute output_dir


###### .attribute-type Boolean
If true, esbuild produces an output directory containing all the output files from code splitting

See https://esbuild.github.io/api/#splitting for more details
            


##### .attribute output_map


###### .attribute-type Output
Name of the output source map when bundling


##### .attribute platform


###### .attribute-type String
The platform to bundle for.

See https://esbuild.github.io/api/#platform for more details
            


##### .attribute sources_content


###### .attribute-type Boolean
If False, omits the `sourcesContent` field from generated source maps

See https://esbuild.github.io/api/#sources-content for more details
            


##### .attribute srcs


###### .attribute-type Label List
Non-entry point JavaScript source files from the workspace.

You must not repeat file(s) passed to entry_point


##### .attribute target


###### .attribute-type String
Environment target (e.g. es2017, chrome58, firefox57, safari11, 
edge16, node10, default esnext)

See https://esbuild.github.io/api/#target for more details
            


##### .attribute tool (required)


###### .attribute-type Label
An executable for the esbuild binary
