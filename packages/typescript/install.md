# TypeScript rules for Bazel

The TypeScript rules integrate the TypeScript compiler with Bazel.

## Alternatives

This package provides Bazel wrappers around the TypeScript compiler.

At a high level, there are two alternatives provided: `ts_project` and `ts_library`.
This section describes the trade-offs between these rules.

`ts_project` simply runs `tsc --project`, with Bazel knowing which outputs to expect based on the TypeScript compiler options, and with interoperability with other TypeScript rules via a Bazel Provider (DeclarationInfo) that transmits the type information.
It is intended as an easy on-boarding for existing TypeScript code and should be familiar if your background is in frontend ecosystem idioms.
Any behavior of `ts_project` should be reproducible outside of Bazel, with a couple of caveats noted in the rule documentation below.

> We used to recommend using the `tsc` rule directly from the `typescript` project, like
> `load("@npm//typescript:index.bzl", "tsc")`
> However `ts_project` is strictly better and should be used instead.

`ts_library` is an open-sourced version of the rule we use to compile TS code at Google.
It should be familiar if your background is in Bazel idioms.
It is very complex, involving code generation of the `tsconfig.json` file, a custom compiler binary, and a lot of extra features.
It is also opinionated, and may not work with existing TypeScript code. For example:

- Your TS code must compile under the `--declaration` flag so that downstream libraries depend only on types, not implementation. This makes Bazel faster by avoiding cascading rebuilds in cases where the types aren't changed.
- We control the output format and module syntax so that downstream rules can rely on them.

On the other hand, `ts_library` is also fast and optimized.
We keep a running TypeScript compile running as a daemon, using Bazel workers.
This process avoids re-parse and re-JIT of the >1MB `typescript.js` and keeps cached bound ASTs for input files which saves time.
We also produce JS code which can be loaded faster (using named AMD module format) and which can be consumed by the Closure Compiler (via integration with [tsickle](https://github.com/angular/tsickle)).

## Installation

Add a devDependency on `@bazel/typescript`

```sh
$ yarn add -D @bazel/typescript
# or
$ npm install --save-dev @bazel/typescript
```

Watch for any peerDependency warnings - we assume you have already installed the `typescript` package from npm.

Some rules require you to add this to your `WORKSPACE` file:

```python
# Set up TypeScript toolchain
load("@npm//@bazel/typescript:index.bzl", "ts_setup_workspace")
ts_setup_workspace()
```

Create a `BUILD.bazel` file in your workspace root. If your `tsconfig.json` file is in the root, use

```python
exports_files(["tsconfig.json"], visibility = ["//visibility:public"])
```

otherwise create an alias:

```python
alias(
    name = "tsconfig.json",
    actual = "//path/to/my:tsconfig.json",
)
```

Make sure to remove the `--noEmit` compiler option from your `tsconfig.json`. This is not compatible with the `ts_library` rule.

## Self-managed npm dependencies

We recommend you use Bazel managed dependencies but if you would like
Bazel to also install a `node_modules` in your workspace you can also
point the `node_repositories` repository rule in your WORKSPACE file to
your `package.json`.

```python
node_repositories(package_json = ["//:package.json"])
```

You can then run `yarn` in your workspace with:

```sh
$ bazel run @nodejs//:yarn_node_repositories
```

To use your workspace `node_modules` folder as a dependency in `ts_library` and
other rules, add the following to your root `BUILD.bazel` file:

```python
filegroup(
    name = "node_modules",
    srcs = glob(
        include = [
          "node_modules/**/*.js",
          "node_modules/**/*.d.ts",
          "node_modules/**/*.json",
          "node_modules/.bin/*",
        ],
        exclude = [
          # Files under test & docs may contain file names that
          # are not legal Bazel labels (e.g.,
          # node_modules/ecstatic/test/public/中文/檔案.html)
          "node_modules/**/test/**",
          "node_modules/**/docs/**",
          # Files with spaces in the name are not legal Bazel labels
          "node_modules/**/* */**",
          "node_modules/**/* *",
        ],
    ),
)

# Create a tsc_wrapped compiler rule to use in the ts_library
# compiler attribute when using self-managed dependencies
nodejs_binary(
    name = "@bazel/typescript/tsc_wrapped",
    entry_point = "@bazel/typescript/internal/tsc_wrapped/tsc_wrapped.js",
    # Point bazel to your node_modules to find the entry point
    node_modules = ["//:node_modules"],
)
```

See https://github.com/bazelbuild/rules_nodejs#dependencies for more information on
managing npm dependencies with Bazel.

## Customizing the TypeScript compiler binary

An example use case is needing to increase the NodeJS heap size used for compilations.

Similar to above, you declare your own binary for running tsc_wrapped, e.g.:

```python
nodejs_binary(
    name = "tsc_wrapped_bin",
    entry_point = "@npm//:node_modules/@bazel/typescript/internal/tsc_wrapped/tsc_wrapped.js",
    templated_args = [
        "--node_options=--max-old-space-size=2048",
    ],
    data = [
        "@npm//protobufjs",
        "@npm//source-map-support",
        "@npm//tsutils",
        "@npm//typescript",
        "@npm//@bazel/typescript",
    ],
)
```

then refer to that target in the `compiler` attribute of your `ts_library` rule.

Note that `nodejs_binary` targets generated by `npm_install`/`yarn_install` can include data dependencies
on packages which aren't declared as dependencies. For example, if you use [tsickle] to generate Closure Compiler-compatible JS, then it needs to be a `data` dependency of `tsc_wrapped` so that it can be loaded at runtime.
￼
[tsickle]: https://github.com/angular/tsickle

# Usage

## Compiling TypeScript: `ts_library`

The `ts_library` rule invokes the TypeScript compiler on one compilation unit,
or "library" (generally one directory of source files).

Create a `BUILD` file next to your sources:

```python
package(default_visibility=["//visibility:public"])
load("//packages/typescript:index.bzl", "ts_library")

ts_library(
    name = "my_code",
    srcs = glob(["*.ts"]),
    deps = ["//path/to/other:library"],
)
```

If your ts_library target has npm dependencies you can specify these
with fine grained npm dependency targets created by the `yarn_install` or
`npm_install` rules:

```python
ts_library(
    name = "my_code",
    srcs = glob(["*.ts"]),
    deps = [
      "@npm//@types/node",
      "@npm//@types/foo",
      "@npm//foo",
      "//path/to/other:library",
    ],
)
```

You can also use the `@npm//@types` target which will include all
packages in the `@types` scope as dependencies.

If you are using self-managed npm dependencies, you can use the
`node_modules` attribute in `ts_library` and point it to the
`//:node_modules` filegroup defined in your root `BUILD.bazel` file.
You'll also need to override the `compiler` attribute if you do this
as the Bazel-managed deps and self-managed cannot be used together
in the same rule.

```python
ts_library(
    name = "my_code",
    srcs = glob(["*.ts"]),
    deps = ["//path/to/other:library"],
    node_modules = "//:node_modules",
    compiler = "//:@bazel/typescript/tsc_wrapped",
)
```

To build a `ts_library` target run:

`bazel build //path/to/package:target`

The resulting `.d.ts` file paths will be printed. Additionally, the `.js`
outputs from TypeScript will be written to disk, next to the `.d.ts` files <sup>1</sup>.

Note that the `tsconfig.json` file used for compilation should be the same one
your editor references, to keep consistent settings for the TypeScript compiler.
By default, `ts_library` uses the `tsconfig.json` file in the workspace root
directory. See the notes about the `tsconfig` attribute in the [ts_library API docs].

> <sup>1</sup> The
> [declarationDir](https://www.typescriptlang.org/docs/handbook/compiler-options.html)
> compiler option will be silently overwritten if present.

[ts_library API docs]: http://tsetse.info/api/build_defs.html#ts_library

## Accessing JavaScript outputs

The default output of the `ts_library` rule is the `.d.ts` files.
This is for a couple reasons:

- help ensure that downstream rules which access default outputs will not require
  a cascading re-build when only the implementation changes but not the types
- make you think about whether you want the devmode (named UMD) or prodmode outputs

You can access the JS output by adding a `filegroup` rule after the `ts_library`,
for example

```python
ts_library(
    name = "compile",
    srcs = ["thing.ts"],
)

filegroup(
    name = "thing.js",
    srcs = ["compile"],
    # Change to es6_sources to get the 'prodmode' JS
    output_group = "es5_sources",
)

my_rule(
    name = "uses_js",
    deps = ["thing.js"],
)
```

## Serving TypeScript for development

There are two choices for development mode:

1. Use the `ts_devserver` rule to bring up our simple, fast development server.
   This is intentionally very simple, to help you get started quickly. However,
   since there are many development servers available, we do not want to mirror
   their features in yet another server we maintain.
1. Teach your real frontend server to serve files from Bazel's output directory.
   This is not yet documented. Choose this option if you have an existing server
   used in development mode, or if your requirements exceed what the
   `ts_devserver` supports. Be careful that your development round-trip stays
   fast (should be under two seconds).

To use `ts_devserver`, you simply `load` the rule, and call it with `deps` that
point to your `ts_library` target(s):

```python
load("//packages/typescript:index.bzl", "ts_devserver", "ts_library")

ts_library(
    name = "app",
    srcs = ["app.ts"],
)

ts_devserver(
    name = "devserver",
    # We'll collect all the devmode JS sources from these TypeScript libraries
    deps = [":app"],
    # This is the path we'll request from the browser, see index.html
    serving_path = "/bundle.js",
    # The devserver can serve our static files too
    static_files = ["index.html"],
)
```

The `index.html` should be the same one you use for production, and it should
load the JavaScript bundle from the path indicated in `serving_path`.

If you don't have an index.html file, a simple one will be generated by the
`ts_devserver`.

See `examples/app` in this repository for a working example. To run the
devserver, we recommend you use [ibazel]:

```sh
$ ibazel run examples/app:devserver
```

`ibazel` will keep the devserver program running, and provides a LiveReload
server so the browser refreshes the application automatically when each build
finishes.

[ibazel]: https://github.com/bazelbuild/bazel-watcher

## Writing TypeScript code for Bazel

Bazel's TypeScript compiler has your workspace path mapped, so you can import
from an absolute path starting from your workspace.

`/WORKSPACE`:
```python
workspace(name = "myworkspace")
```

`/some/long/path/to/deeply/nested/subdirectory.ts`:
```javascript
import {thing} from 'myworkspace/place';
```

will import from `/place.ts`.


Since this is an extension to the vanilla TypeScript compiler, editors which use the TypeScript language services to provide code completion and inline type checking will not be able to resolve the modules. In the above example, adding
```json
"paths": {
    "myworkspace/*": ["*"]
}
```
to `tsconfig.json` will fix the imports for the common case of using absolute paths.
See [path mapping] for more details on the paths syntax.

Similarly, you can use path mapping to teach the editor how to resolve imports
from `ts_library` rules which set the `module_name` attribute.

## Notes

If you'd like a "watch mode", try [ibazel].

At some point, we plan to release a tool similar to [gazelle] to generate the
BUILD files from your source code.

[gazelle]: https://github.com/bazelbuild/rules_go/tree/master/go/tools/gazelle
[ibazel]: https://github.com/bazelbuild/bazel-watcher
[path mapping]: https://www.typescriptlang.org/docs/handbook/module-resolution.html#path-mapping

# API documentation
