---
title: TypeScript
layout: default
stylesheet: docs
---
# TypeScript rules for Bazel

**WARNING: this is beta-quality software. Breaking changes are likely. Not recommended for production use without expert support.**

The TypeScript rules integrate the TypeScript compiler with Bazel.

Looking for Karma rules `ts_web_test` and `karma_web_test`?
These are now documented in the README at http://npmjs.com/package/@bazel/karma


## Installation

Add a devDependency on `@bazel/typescript`

```sh
$ yarn add -D @bazel/typescript
# or
$ npm install --save-dev @bazel/typescript
```

Watch for any peerDependency warnings - we assume you have already installed the `typescript` package from npm.

Your `WORKSPACE` should declare a `yarn_install` or `npm_install` rule named `npm`.
It should then install the rules found in the npm packages using the `install_bazel_dependencies` function.
See https://github.com/bazelbuild/rules_nodejs/#quickstart

Add to your `WORKSPACE` file, after `install_bazel_dependencies()`:

```python
# Setup TypeScript toolchain
load("@npm_bazel_typescript//:index.bzl", "ts_setup_workspace")
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
$ bazel run @nodejs//:yarn
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

# Usage


## Compiling TypeScript: `ts_library`

The `ts_library` rule invokes the TypeScript compiler on one compilation unit,
or "library" (generally one directory of source files).

Create a `BUILD` file next to your sources:

```python
package(default_visibility=["//visibility:public"])
load("@npm_bazel_typescript//:index.bzl", "ts_library")

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

You can also you the `@npm//@types` target which will include all
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
load("@npm_bazel_typescript//:index.bzl", "ts_devserver", "ts_library")

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


Since this is an extension to the vanillia TypeScript compiler, editors which use the TypeScript language services to provide code completion and inline type checking will not be able to resolve the modules. In the above example, adding
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
[name]: https://bazel.build/docs/build-ref.html#name
[label]: https://bazel.build/docs/build-ref.html#labels
[labels]: https://bazel.build/docs/build-ref.html#labels


## ts_config

Allows a tsconfig.json file to extend another file.

Normally, you just give a single `tsconfig.json` file as the tsconfig attribute
of a `ts_library` rule. However, if your `tsconfig.json` uses the `extends`
feature from TypeScript, then the Bazel implementation needs to know about that
extended configuration file as well, to pass them both to the TypeScript compiler.



### Usage

```
ts_config(name, deps, src)
```



#### `name`
(*[name], mandatory*): A unique name for this target.


#### `deps`
(*[labels], mandatory*): Additional tsconfig.json files referenced via extends


#### `src`
(*[label], mandatory*): The tsconfig.json file passed to the TypeScript compiler



## ts_devserver

ts_devserver is a simple development server intended for a quick "getting started" experience.

Additional documentation at https://github.com/alexeagle/angular-bazel-example/wiki/Running-a-devserver-under-Bazel



### Usage

```
ts_devserver(name, additional_root_paths, bootstrap, data, deps, devserver, entry_module, index_html, port, scripts, serving_path, static_files)
```



#### `name`
(*[name], mandatory*): A unique name for this target.


#### `additional_root_paths`
(*List of strings*): Additional root paths to serve `static_files` from.
            Paths should include the workspace name such as `["__main__/resources"]`


#### `bootstrap`
(*[labels]*): Scripts to include in the JS bundle before the module loader (require.js)


#### `data`
(*[labels]*): Dependencies that can be require'd while the server is running


#### `deps`
(*[labels]*): Targets that produce JavaScript, such as `ts_library`


#### `devserver`
(*[label]*): Go based devserver executable.
            Defaults to precompiled go binary in @npm_bazel_typescript setup by @bazel/typescript npm package


#### `entry_module`
(*String*): The `entry_module` should be the AMD module name of the entry module such as `"__main__/src/index".`
            `ts_devserver` concats the following snippet after the bundle to load the application:
            `require(["entry_module"]);`


#### `index_html`
(*[label]*): An index.html file, we'll inject the script tag for the bundle,
            as well as script tags for .js static_files and link tags for .css
            static_files


#### `port`
(*Integer*): The port that the devserver will listen on.


#### `scripts`
(*[labels]*): User scripts to include in the JS bundle before the application sources


#### `serving_path`
(*String*): The path you can request from the client HTML which serves the JavaScript bundle.
            If you don't specify one, the JavaScript can be loaded at /_/ts_scripts.js


#### `static_files`
(*[labels]*): Arbitrary files which to be served, such as index.html.
            They are served relative to the package where this rule is declared.



## ts_library

`ts_library` type-checks and compiles a set of TypeScript sources to JavaScript.

It produces declarations files (`.d.ts`) which are used for compiling downstream
TypeScript targets and JavaScript for the browser and Closure compiler.



### Usage

```
ts_library(name, compile_angular_templates, compiler, data, deps, expected_diagnostics, generate_externs, internal_testing_type_check_dependencies, module_name, module_root, node_modules, runtime, runtime_deps, srcs, supports_workers, tsconfig, tsickle_typed)
```



#### `name`
(*[name], mandatory*): A unique name for this target.


#### `compile_angular_templates`
(*Boolean*): Run the Angular ngtsc compiler under ts_library


#### `compiler`
(*[label]*): Sets a different TypeScript compiler binary to use for this library.
For example, we use the vanilla TypeScript tsc.js for bootstrapping,
and Angular compilations can replace this with `ngc`.

The default ts_library compiler depends on the `@npm//@bazel/typescript`
target which is setup for projects that use bazel managed npm deps that
fetch the @bazel/typescript npm package. It is recommended that you use
the workspace name `@npm` for bazel managed deps so the default
compiler works out of the box. Otherwise, you'll have to override
the compiler attribute manually.


#### `data`
(*[labels]*)


#### `deps`
(*[labels]*): Compile-time dependencies, typically other ts_library targets


#### `expected_diagnostics`
(*List of strings*)


#### `generate_externs`
(*Boolean*)


#### `internal_testing_type_check_dependencies`
(*Boolean*): Testing only, whether to type check inputs that aren't srcs.


#### `module_name`
(*String*)


#### `module_root`
(*String*)


#### `node_modules`
(*[label]*): The npm packages which should be available during the compile.

The default value is `@npm//typescript:typescript__typings` is setup
for projects that use bazel managed npm deps that. It is recommended
that you use the workspace name `@npm` for bazel managed deps so the
default node_modules works out of the box. Otherwise, you'll have to
override the node_modules attribute manually. This default is in place
since ts_library will always depend on at least the typescript
default libs which are provided by `@npm//typescript:typescript__typings`.

This attribute is DEPRECATED. As of version 0.18.0 the recommended
approach to npm dependencies is to use fine grained npm dependencies
which are setup with the `yarn_install` or `npm_install` rules.

For example, in targets that used a `//:node_modules` filegroup,

```
ts_library(
    name = "my_lib",
    ...
    node_modules = "//:node_modules",
)
```

which specifies all files within the `//:node_modules` filegroup
to be inputs to the `my_lib`. Using fine grained npm dependencies,
`my_lib` is defined with only the npm dependencies that are
needed:

```
ts_library(
    name = "my_lib",
    ...
    deps = [
        "@npm//@types/foo",
        "@npm//@types/bar",
        "@npm//foo",
        "@npm//bar",
        ...
    ],
)
```

In this case, only the listed npm packages and their
transitive deps are includes as inputs to the `my_lib` target
which reduces the time required to setup the runfiles for this
target (see https://github.com/bazelbuild/bazel/issues/5153).
The default typescript libs are also available via the node_modules
default in this case.

The @npm external repository and the fine grained npm package
targets are setup using the `yarn_install` or `npm_install` rule
in your WORKSPACE file:

```
yarn_install(
    name = "npm",
    package_json = "//:package.json",
    yarn_lock = "//:yarn.lock",
)
```


#### `runtime`
(*String*)


#### `runtime_deps`
(*[labels]*)


#### `srcs`
(*[labels], mandatory*): The TypeScript source files to compile.


#### `supports_workers`
(*Boolean*): Intended for internal use only.

Allows you to disable the Bazel Worker strategy for this library.
Typically used together with the "compiler" setting when using a
non-worker aware compiler binary.


#### `tsconfig`
(*[label]*): A tsconfig.json file containing settings for TypeScript compilation.
Note that some properties in the tsconfig are governed by Bazel and will be
overridden, such as `target` and `module`.

The default value is set to `//:tsconfig.json` by a macro. This means you must
either:

- Have your `tsconfig.json` file in the workspace root directory
- Use an alias in the root BUILD.bazel file to point to the location of tsconfig:
    `alias(name="tsconfig.json", actual="//path/to:tsconfig-something.json")`
- Give an explicit `tsconfig` attribute to all `ts_library` targets


#### `tsickle_typed`
(*Boolean*): If using tsickle, instruct it to translate types to ClosureJS format



## ts_proto_library

Wraps https://github.com/dcodeIO/protobuf.js for use in Bazel.

`ts_proto_library` has identical outputs to `ts_library`, so it can be used anywhere
a `ts_library` can appear, such as in the `deps[]` of another `ts_library`.

Example:

```python
load("@npm_bazel_typescript//:index.bzl", "ts_library", "ts_proto_library")

proto_library(
    name = "car_proto",
    srcs = ["car.proto"],
)

ts_proto_library(
    name = "car",
    deps = [":car_proto"],
)

ts_library(
    name = "test_lib",
    testonly = True,
    srcs = ["car.spec.ts"],
    deps = [":car"],
)
```

Note in this example we named the `ts_proto_library` rule `car` so that the
result will be `car.d.ts`. This means our TypeScript code can just
`import {symbols} from './car'`. Use the `output_name` attribute if you want to
name the rule differently from the output file.

The JavaScript produced by protobuf.js has a runtime dependency on a support library.
Under devmode (e.g. `ts_devserver`, `ts_web_test_suite`) you'll need to include these scripts
in the `bootstrap` phase (before Require.js loads). You can use the label
`@npm_bazel_typescript//:protobufjs_bootstrap_scripts` to reference these scripts
in the `bootstrap` attribute of `ts_web_test_suite` or `ts_devserver`.

To complete the example above, you could write a `ts_web_test_suite`:

```python
load("@npm_bazel_karma//:index.bzl", "ts_web_test_suite")

ts_web_test_suite(
    name = "test",
    deps = ["test_lib"],
    bootstrap = ["@npm_bazel_typescript//:protobufjs_bootstrap_scripts"],
    browsers = [
        "@io_bazel_rules_webtesting//browsers:chromium-local",
        "@io_bazel_rules_webtesting//browsers:firefox-local",
    ],
)
```



### Usage

```
ts_proto_library(name, deps, output_name)
```



#### `name`
(*[name], mandatory*): A unique name for this target.


#### `deps`
(*[labels]*): proto_library targets


#### `output_name`
(*String*): Name of the resulting module, which you will import from.
            If not specified, the name will match the target's name.



## check_rules_typescript_version

    Verify that a compatible npm_bazel_typescript is loaded a WORKSPACE.

Where COMPAT_VERSION and VERSION come from the npm_bazel_typescript that
is loaded in a WORKSPACE, this function will check:

VERSION >= version_string >= COMPAT_VERSION

This should be called from the `WORKSPACE` file so that the build fails as
early as possible. For example:

```
# in WORKSPACE:
load("@npm_bazel_typescript//:index.bzl", "check_rules_typescript_version")
check_rules_typescript_version(version_string = "0.22.0")
```



### Usage

```
check_rules_typescript_version(version_string)
```



#### `version_string`
      

A version string to check for compatibility with the loaded version
                of npm_bazel_typescript. The version check performed is
                `VERSION >= version_string >= COMPAT_VERSION` where VERSION and COMPAT_VERSION
                come from the loaded version of npm_bazel_typescript.      




## ts_setup_workspace

This repository rule should be called from your WORKSPACE file.

It creates some additional Bazel external repositories that are used internally
by the TypeScript rules.


### Usage

```
ts_setup_workspace()
```



