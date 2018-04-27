# NodeJS rules for Bazel


Circle CI | Bazel CI
:---: | :---:
[![CircleCI](https://circleci.com/gh/bazelbuild/rules_nodejs.svg?style=svg)](https://circleci.com/gh/bazelbuild/rules_nodejs) | [![Build status](https://badge.buildkite.com/af1a592b39b11923ef0f523cbb223dd3dbd61629f8bc813c07.svg)](https://buildkite.com/bazel/nodejs-rules-nodejs-postsubmit)

**This is an alpha-quality release. Breaking changes are likely.**

The nodejs rules integrate NodeJS development toolchain and runtime with Bazel.

This toolchain can be used to build applications that target a browser runtime,
so this repo can be thought of as "JavaScript rules for Bazel" as well.

## Installation

First, install a current bazel distribution, following the [bazel instructions].

Next, create a `WORKSPACE` file in your project root (or edit the existing one)
containing:

```python
git_repository(
    name = "build_bazel_rules_nodejs",
    remote = "https://github.com/bazelbuild/rules_nodejs.git",
    tag = "0.3.1", # check for the latest tag when you install
)

load("@build_bazel_rules_nodejs//:defs.bzl", "node_repositories")

# NOTE: this rule installs nodejs, npm, and yarn, but does NOT install
# your npm dependencies into your node_modules folder.
# You must still run the package manager to do this.
node_repositories(package_json = ["//:package.json"])
```

### Installation with a specific supported version of NodejS and Yarn

In your `WORKSPACE` file, use the following:

```python
git_repository(
    name = "build_bazel_rules_nodejs",
    remote = "https://github.com/bazelbuild/rules_nodejs.git",
    tag = "0.3.1", # check for the latest tag when you install
)

load("@build_bazel_rules_nodejs//:defs.bzl", "node_repositories")

# NOTE: this rule installs nodejs, npm, and yarn, but does NOT install
# your npm dependencies into your node_modules folder.
# You must still run the package manager to do this.
node_repositories(package_json = ["//:package.json"], node_version = "8.11.1", yarn_version = "1.5.1")
```

#### Currently supported versions

* 9.11.1
* 8.11.1
* 8.9.1

### Installation with a manually specified version of NodeJS and Yarn

If you'd like to use a version of NodeJS and/or Yarn that are not currently supported here, you can manually
specify those via:

```python
git_repository(
    name = "build_bazel_rules_nodejs",
    remote = "https://github.com/bazelbuild/rules_nodejs.git",
    tag = "0.3.1", # check for the latest tag when you install
)

load("@build_bazel_rules_nodejs//:defs.bzl", "node_repositories", "node_download_runtime", "yarn_download")

node_download_runtime(
    name = "nodejs",
    version = "8.10.0",
    packages = {
        "darwin_amd64": ("node-v8.10.0-darwin-x64.tar.gz", "node-v8.10.0-darwin-x64", "7d77bd35bc781f02ba7383779da30bd529f21849b86f14d87e097497671b0271"),
        "linux_amd64": ("node-v8.10.0-linux-x64.tar.xz", "node-v8.10.0-linux-x64", "92220638d661a43bd0fee2bf478cb283ead6524f231aabccf14c549ebc2bc338"),
        "windows_amd64": ("node-v8.10.0-win-x64.zip", "node-v8.10.0-win-x64", "936ada36cb6f09a5565571e15eb8006e45c5a513529c19e21d070acf0e50321b"),
    },
    package_json = ["//:package.json"])

yarn_download(
    name = "yarn",
    version = "1.5.1",
    filename = "yarn-v1.5.1.tar.gz",
    strip_prefix = "yarn-v1.5.1",
    sha256 = "cd31657232cf48d57fdbff55f38bfa058d2fb4950450bd34af72dac796af4de1",
    package_json = ["//:package.json"])

# This rule will see the previously installed versions of NodeJS and Yarn from above and will skip attempting to set
# them up.
# NOTE: this rule does NOT install your npm dependencies into your node_modules folder.
# You must still run the package manager to do this.
node_repositories(package_json = ["//:package.json"])
```

### Installation with local vendored versions of NodeJS and Yarn

```python
git_repository(
    name = "build_bazel_rules_nodejs",
    remote = "https://github.com/bazelbuild/rules_nodejs.git",
    tag = "0.3.1", # check for the latest tag when you install
)

load("@build_bazel_rules_nodejs//:defs.bzl", "node_repositories", "node_local_runtime", "yarn_local")

node_local_runtime(
    name = "nodejs",
    path = "path/to/node/base",
    package_json = ["//:package.json"])

yarn_local(
    name = "yarn",
    path = "path/to/yarn/base",
    package_json = ["//:package.json"])

# This rule will see the previously installed versions of NodeJS and Yarn from above and will skip attempting to set
# them up.
# NOTE: this rule does NOT install your npm dependencies into your node_modules folder.
# You must still run the package manager to do this.
node_repositories(package_json = ["//:package.json"])
```

## Dependencies

You have two options for managing your `node_modules` dependencies.

### Using self-managed dependencies

If you'd like to have Bazel use the `node_modules` directory you are managing,
then next you will create a `BUILD.bazel` file in your project root containing:

```python
package(default_visibility = ["//visibility:public"])

# NOTE: this may move to node_modules/BUILD in a later release
filegroup(name = "node_modules", srcs = glob(["node_modules/**/*"]))
```

We recommend using the version of the package management tools installed by
Bazel to ensure everything is compatible.

To use the Yarn package manager, which we recommend for its built-in
verification command, you can run:

```sh
$ bazel run @yarn//:yarn
```

If you use npm instead, run:

```sh
$ bazel run @nodejs//:npm install
```

[bazel instructions]: https://docs.bazel.build/versions/master/install.html

### Using Bazel-managed dependencies

To have Bazel manage its own copy of `node_modules`, which is useful to avoid
juggling multiple toolchains, you can add one of the following to your `WORKSPACE`
file:

Using Yarn (preferred):

```python
load("@build_bazel_rules_nodejs//:defs.bzl", "yarn_install")

yarn_install(
    name = "foo",
    package_json = "//:package.json",
    yarn_lock = "//:yarn.lock",
)
```

Using NPM:

```python
load("@build_bazel_rules_nodejs//:defs.bzl", "npm_install")

npm_install(
    name = "foo",
    package_json = "//:package.json",
    package_lock_json = "//:package-lock.json",
)
```

You can then reference this version of `node_modules` in your `BUILD` rules via:

```python
load("@build_bazel_rules_nodejs//:defs.bzl", "nodejs_binary")

nodejs_binary(
    name = "bar",
    # Ordinarily this defaults to //:node_modules
    node_modules = "@foo//:node_modules",
    ...
)
```

With this approach, Bazel is responsible for making sure that `node_modules` is
up to date with `package[-lock].json` or `yarn.lock`.  This means Bazel will set it up when the
repo is first cloned, and rebuild it whenever it changes.

For Bazel to provide the strongest guarantees about reproducibility and the
fidelity of your build, it is recommended that you let Bazel take responsibility
for this.

However, this approach manages a second copy of `node_modules`, so if you are
juggling Bazel and other tooling, or sensitive to the additional network traffic
this might incur, consider self-managing.

## Usage

The `nodejs_binary` rule allows you to run an application by giving the entry point.
The entry point can come from an external dependency installed by the package manager,
or it can be a `.js` file from a package built by Bazel.

`nodejs_test` is the same as nodejs_binary, but instead of calling it with `bazel run`,
you call it with `bazel test`. The test passes if the program exits with a zero exit code.

The `jasmine_node_test` rule allows you to write a test that executes in NodeJS.

`rollup_bundle` runs the Rollup and Uglify toolchain to produce a single JavaScript bundle.

`npm_package` packages up a library to publish to npm.

### Running a program from npm

If you have installed the [rollup] package, you could write this rule:

```python
load("@build_bazel_rules_nodejs//:defs.bzl", "nodejs_binary")

nodejs_binary(
    name = "rollup",
    entry_point = "rollup/bin/rollup",
)
```

and run it with

```sh
$ bazel run :rollup -- --help
```

See the `examples/rollup` directory in this repository.

[rollup]: https://www.npmjs.com/package/rollup

### Running a program from local sources

We can reference a path in the local workspace to run a program we write.

```python
load("@build_bazel_rules_nodejs//:defs.bzl", "nodejs_binary")

nodejs_binary(
    name = "example",
    data = [
        "@//:node_modules",
        "main.js",
    ],
    entry_point = "workspace_name/main.js",
    args = ["--node_options=--expose-gc"],
)
```

This example illustrates how to pass arguments to nodejs (as opposed to passing arguments to the program).

The `data` attribute is optional, by default it includes the `node_modules` directory. To include your own
sources, include a file or target that produces JavaScript.

See the `examples/program` directory in this repository.

### Testing

The `jasmine_node_test` rule can be used to run unit tests in NodeJS, using the Jasmine framework.
Targets declared with this rule can be run with `bazel test`.

Attributes:

The `srcs` of a `jasmine_node_test` should include the test `.js` files.
The `deps` should include the production `.js` sources, or other rules which produce `.js` files, such as TypeScript.

The `examples/program/index.spec.js` file illustrates this. Another usage is in https://github.com/angular/tsickle/blob/master/test/BUILD

### Stamping

Bazel is generally only a build tool, and is unaware of your version control system.
However, when publishing releases, you typically want to embed version information in the resulting distribution.
Bazel supports this natively, using the following approach:

1) Your `tools/bazel.rc` should pass the `workspace_status_command` argument to `bazel build`.
   This tells Bazel how to interact with the version control system when needed.

    ```
    build --workspace_status_command=./tools/bazel_stamp_vars.sh
    ```


1) Create `tools/bazel_stamp_vars.sh`.
   This is a script that prints variable/value pairs.
   Make sure you set the executable bit, eg. `chmod 755 tools/bazel_stamp_vars.sh`.
   For example, we could run `git describe` to get the current tag:

    ```bash
    #!/usr/bin/env bash
    echo BUILD_SCM_VERSION $(git describe --abbrev=7 --tags HEAD)
    ```

   For a more full-featured script, take a look at the [bazel_stamp_vars in Angular]

Ideally, `rollup_bundle` and `npm_package` should honor the `--stamp` argument to `bazel build`. However this is not currently possible, see https://github.com/bazelbuild/bazel/issues/1054

> WARNING: Bazel doesn't rebuild a target if only the result of the workspace_status_command has changed. That means changes to the version information may not be reflected if you re-build the package or bundle, and nothing in the package or bundle has changed.

See https://www.kchodorow.com/blog/2017/03/27/stamping-your-builds/ for more background.

[bazel_stamp_vars in Angular]: https://github.com/angular/angular/blob/master/tools/bazel_stamp_vars.sh

### Bundling/optimizing

A `rollup_bundle` rule produces three bundle files:

1. ES5 syntax, minified by uglify. This is the default output of the rule, meaning this file will be provided when this rule appears in the `deps[]` of another rule.

```sh
$ bazel build internal/e2e/rollup:bundle
```

2. ES5 syntax, un-minified.

```sh
$ bazel build internal/e2e/rollup:bundle.js
```

3. ES2015 syntax, un-minified.

```
$ bazel build internal/e2e/rollup:bundle.es6.js
```

Attributes:

`srcs` are `.js` files to be included in the bundle

`deps` are other rules which produce `.js` files, such as `ts_library`

`entry_point` is the main file of the application that will be executed. Only
sources reachable from the import graph of this file will be included in the
bundle.

`stamp_data` is a label of a file containing version info. See the Stamping section above.

> Note: we expect other bundling rules will follow later, such as Closure compiler and Webpack.

### Publishing to npm

The `npm_package` rule is used to create a package to publish to external users who do not use Bazel.

> For those downstream dependencies that use Bazel, they can simply write BUILD files to consume your library.

You can use a pair of `// BEGIN-INTERNAL ... // END-INTERNAL` comments to mark regions of files that should be elided during publishing.
For example:

```javascript
function doThing() {
    // BEGIN-INTERNAL
    // This is a secret internal-only comment
    doInternalOnlyThing();
    // END-INTERNAL
}
```

Attributes:

`srcs` are files in your input tree

`deps` are other rules which produce arbitrary files

`replacements` is a dictionary of JS regexp to new string, in addition to the BEGIN/END-INTERNAL replacement.

`stamp_data` is a label of a file containing version info. See the Stamping section above.

Example:

```python
load("@build_bazel_rules_nodejs//:defs.bzl", "npm_package")

npm_package(
    name = "my_package",
    srcs = ["package.json"],
    deps = [":my_typescript_lib"],
    replacements = {"//internal/": "//"},
)
```

Usage:

`npm_package` yields three labels. Build the package directory using the default label:

```sh
$ bazel build :my_package
Target //:my_package up-to-date:
  bazel-out/fastbuild/bin/my_package
$ ls -R bazel-out/fastbuild/bin/my_package
```

Dry-run of publishing to npm, calling `npm pack` (it builds the package first if needed):

```sh
$ bazel run :my_package.pack
INFO: Running command line: bazel-out/fastbuild/bin/my_package.pack
my-package-name-1.2.3.tgz
$ tar -tzf my-package-name-1.2.3.tgz
```

Actually publish the package with `npm publish` (also builds first):

```sh
# Check login credentials
$ bazel run @nodejs//:npm who
# Publishes the package
$ bazel run :my_package.publish
```

# Design

Most bazel rules include package management. That is, the `WORKSPACE` file installs your dependencies as well as the toolchain. In some environments, this is the normal workflow, for example in Java, Gradle and Maven are each both a build tool and a package manager.

In nodejs, there are a variety of package managers and build tools which can interoperate. Also, there is a well-known package installation location (`node_modules` directory in your project). Command-line and other tools look in this directory to find packages. So we must either download packages twice (risking version skew between them) or point all tools to Bazel's `external` directory with `NODE_PATH` which would be very inconvenient.

Instead, our philosophy is: in the NodeJS ecosystem, Bazel is only a build tool. It is up to the user to install packages into their `node_modules` directory, though the build tool can verify the contents.

## Hermeticity and reproducibility

Bazel generally guarantees builds are correct with respect to their inputs. For example, this means that given the same source tree, you can re-build the same artifacts as an earlier release of your program. In the nodejs rules, Bazel is not the package manager, so some reponsibility falls to the developer to avoid builds that use the wrong dependencies. This problem exists with any build system in the JavaScript ecosystem.

Both NPM and Yarn have a lockfile, which ensures that dependencies only change when the lockfile changes. Users are *strongly encouraged* to use the locking mechanism in their package manager.

References:

- npm: https://docs.npmjs.com/files/package-lock.json
- yarn: https://yarnpkg.com/lang/en/docs/yarn-lock/

Note that https://github.com/bazelbuild/rules_nodejs/issues/1 will take the guarantee further: by using the lockfile as an input to Bazel, the nodejs rules can verify the integrity of the dependencies. This would make it impossible for a build to be non-reproducible, so long as you have the same lockfile.
