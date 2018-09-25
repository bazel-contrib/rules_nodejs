# TypeScript rules for Bazel

Circle CI | Bazel CI
:---: | :---:
[![CircleCI](https://circleci.com/gh/bazelbuild/rules_typescript.svg?style=svg)](https://circleci.com/gh/bazelbuild/rules_typescript) | [![Build status](https://badge.buildkite.com/7f98e137cd86baa5a4040a7e750bef87ef5fd293092fdaf878.svg)](https://buildkite.com/bazel/typescript-rules-typescript-postsubmit)

**WARNING: this is beta-quality software. Breaking changes are likely. Not recommended for production use without expert support.**

The TypeScript rules integrate the TypeScript compiler with Bazel.

## API Docs

Generated documentation for using each rule is at:
http://tsetse.info/api/

## Installation

First, install a current Bazel distribution.

Add the `@bazel/typescript` npm package to your `package.json` `devDependencies`.
Optionally add the `@bazel/karma` npm package if you would like to use the
`ts_web_test_suite` rule.

```
{
  ...
  "devDependencies": {
    "@bazel/typescript": "0.18.0",
    "@bazel/karma": "0.18.0",
    ...
  },
  ...
}
```

Create a `BUILD.bazel` file in your project root:

```python
package(default_visibility = ["//visibility:public"])
exports_files(["tsconfig.json"])
```

Next create a `WORKSPACE` file in your project root (or edit the existing one)
containing:

```python
http_archive(
    name = "build_bazel_rules_typescript",
    url = "https://github.com/bazelbuild/rules_typescript/archive/0.18.0.zip",
    strip_prefix = "rules_typescript-0.18.0",
)

# Fetch our Bazel dependencies that aren't distributed on npm
load("@build_bazel_rules_typescript//:package.bzl", "rules_typescript_dependencies")
rules_typescript_dependencies()

# Setup TypeScript toolchain
load("@build_bazel_rules_typescript//:defs.bzl", "ts_setup_workspace")
ts_setup_workspace()

# Setup the NodeJS toolchain
load("@build_bazel_rules_nodejs//:defs.bzl", "node_repositories", "yarn_install")
node_repositories()

# Setup Bazel managed npm dependencies with the `yarn_install` rule.
# The name of this rule should be set to `npm` so that `ts_library` and `ts_web_test_suite`
# can find your npm dependencies by default in the `@npm` workspace. You may
# also use the `npm_install` rule with a `package-lock.json` file if you prefer.
# See https://github.com/bazelbuild/rules_nodejs#dependencies for more info.
yarn_install(
  name = "npm",
  package_json = "//:package.json",
  yarn_lock = "//:yarn.lock",
)

# Setup Go toolchain
load("@io_bazel_rules_go//go:def.bzl", "go_rules_dependencies", "go_register_toolchains")
go_rules_dependencies()
go_register_toolchains()

# Setup web testing, choose browsers we can test on
load("@io_bazel_rules_webtesting//web:repositories.bzl", "browser_repositories", "web_test_repositories")

web_test_repositories()
browser_repositories(
    chromium = True,
)
```

# Self-managed npm dependencies

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
    entry_point = "@bazel/typescript/tsc_wrapped/tsc_wrapped.js",
    # The --expose-gc node option is required for tsc_wrapped
    templated_args = ["--node_options=--expose-gc"],
    # Point bazel to your node_modules to find the entry point
    node_modules = ["//:node_modules"],
)

# Create a karma rule to use in ts_web_test_suite karma
# attribute when using self-managed dependencies
nodejs_binary(
    name = "karma/karma",
    entry_point = "karma/bin/karma",
    # Point bazel to your node_modules to find the entry point
    node_modules = ["//:node_modules"],
)
```

See https://github.com/bazelbuild/rules_nodejs#dependencies for more information on
managing npm dependencies with Bazel.

## Usage

### Compiling TypeScript: `ts_library`

The `ts_library` rule invokes the TypeScript compiler on one compilation unit,
or "library" (generally one directory of source files).

Create a `BUILD` file next to your sources:

```python
package(default_visibility=["//visibility:public"])
load("@build_bazel_rules_typescript//:defs.bzl", "ts_library")

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
      "@npm//:@types/node",
      "@npm//:@types/foo",
      "@npm//:foo",
      "//path/to/other:library",
    ],
)
```

You can also you the `@npm//:@types` target which will include all
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

### Serving TypeScript for development

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
load("@build_bazel_rules_typescript//:defs.bzl", "ts_devserver", "ts_library")

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
See https://www.typescriptlang.org/docs/handbook/module-resolution.html#path-mapping for more details on the paths syntax.

Similarly, you can use path mapping to teach the editor how to resolve imports
from `ts_library` rules which set the `module_name` attribute.

## Notes

If you'd like a "watch mode", try https://github.com/bazelbuild/bazel-watcher
(note, it's also quite new).

At some point, we plan to release a tool similar to [gazelle] to generate the
BUILD files from your source code.

In the meantime, we suggest associating the `.bazel` extension with Python in
your editor, so that you get useful syntax highlighting.

[gazelle]: https://github.com/bazelbuild/rules_go/tree/master/go/tools/gazelle

### Releasing

Start from a clean checkout at master/HEAD. Check if there are any breaking
changes since the last tag - if so, this will be a minor, if not, it's a patch.
(This may not sound like semver - but since our major version is a zero, the
rule is that minors are breaking changes and patches are new features).

1. Re-generate the API docs: `yarn skydoc`
1. May be necessary if Go code has changed though probably it was already necessary to run this to keep CI green: `bazel run :gazelle`
1. `git commit -a -m 'Update docs for release'`
1. `npm config set tag-version-prefix ''`
1. `npm version minor -m 'rel: %s'` (replace `minor` with `patch` if no breaking changes)
1. Build npm packages and publish them: `bazel run //internal:npm_package.publish && bazel run //internal/karma:npm_package.publish`
1. `git push && git push --tags`
1. (Temporary): submit a google3 CL to update the versions in package.bzl and package.json
