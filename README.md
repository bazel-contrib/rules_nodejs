# NodeJS rules for Bazel


Circle CI | Bazel CI
:---: | :---:
[![CircleCI](https://circleci.com/gh/bazelbuild/rules_nodejs.svg?style=svg)](https://circleci.com/gh/bazelbuild/rules_nodejs) | [![Build status](https://badge.buildkite.com/af1a592b39b11923ef0f523cbb223dd3dbd61629f8bc813c07.svg?branch=master)](https://buildkite.com/bazel/nodejs-rules-nodejs-postsubmit)

**This is a beta-quality release. Breaking changes are likely.**

The nodejs rules integrate NodeJS development toolchain and runtime with Bazel.

This toolchain can be used to build applications that target a browser runtime,
so this repo can be thought of as "JavaScript rules for Bazel" as well.

## API Docs

Generated documentation for using each rule is at:
https://bazelbuild.github.io/rules_nodejs/

## Quickstart

This is the fastest way to get started.
See sections below for details and alternative methods.

```sh
$ npm init @bazel
```

or if you prefer yarn,

```sh
$ yarn create @bazel
```

> These commands are equivalent to `npx @bazel/create` which downloads the latest version of the `@bazel/create` package from npm and runs the program contained.

See the output of the tool for command-line options and next steps.

## Adopters

Thanks to the following active users!

Open-source repositories:

- [Angular](https://github.com/angular/angular)
- [Angular CLI](https://github.com/angular/angular-cli)
- [Angular Components](https://github.com/angular/components)
- [Selenium](https://github.com/SeleniumHQ/selenium)
- [NgRX](https://github.com/ngrx/platform)
- [tsickle](https://github.com/angular/tsickle)
- [incremental-dom](https://github.com/google/incremental-dom)

Organizations:

- [Evertz](https://www.evertz.com)
- [LucidChart](https://www.lucidchart.com)

Not on this list? [Send a PR](https://github.com/bazelbuild/rules_nodejs/edit/master/README.md) to add your repo or organization!

## Adding Build Targets

Consult the documentation at http://bazel.build for details.

Create a file called `BUILD.bazel` and invoke some rules to create targets.

Some of the available rules are:

| Rule | Description    |
| -------| ------|
| [nodejs_binary]  | Allows you to run an application by giving the entry point. The entry point can come from an external dependency installed by the package manager, or it can be a `.js` file from a package built by Bazel. |
| [nodejs_test]    | The same as `nodejs_binary`, but instead of calling it with `bazel run`, you call it with `bazel test`. The test passes if the program exits with a zero exit code. |
| [jasmine_node_test] | Allows you to write a test that executes in NodeJS using the [Jasmine] test framework. |
| [rollup_bundle] | Runs the Rollup and Terser toolchain to produce a single JavaScript bundle from multiple JavaScript sources. |
| [npm_package] | Creates a package format ready to publish to npm. Can also do the publishing. |
| [ts_library] | Compiles TypeScript code into JavaScript |
| [karma_web_test] | Runs tests in a browser using the [Karma] test runner |

[nodejs_binary]: https://bazelbuild.github.io/rules_nodejs/node/node.html#nodejs_binary
[nodejs_test]: https://bazelbuild.github.io/rules_nodejs/node/node.html#nodejs_test
[jasmine_node_test]: https://www.npmjs.com/package/@bazel/jasmine
[Jasmine]: https://jasmine.github.io/
[rollup_bundle]: https://bazelbuild.github.io/rules_nodejs/rollup/rollup_bundle.html#rollup_bundle
[npm_package]: https://bazelbuild.github.io/rules_nodejs/npm_package/npm_package.html#npm_package
[ts_library]: https://www.npmjs.com/package/@bazel/typescript
[Karma]: https://karma-runner.github.io/latest/index.html
[karma_web_test]: https://www.npmjs.com/package/@bazel/karma

## Custom installation

First, you need Bazel.
We recommend fetching it from npm to keep your frontend workflow similar.

> You could install a current bazel distribution, following the [bazel instructions].
> This has the advantage of setting up Bazel command-line completion.

Next, create a `WORKSPACE` file in your project root (or edit the existing one)
containing:

```python
load("@bazel_tools//tools/build_defs/repo:http.bzl", "http_archive")
http_archive(
    name = "build_bazel_rules_nodejs",
    sha256 = "6d4edbf28ff6720aedf5f97f9b9a7679401bf7fca9d14a0fff80f644a99992b4",
    urls = ["https://github.com/bazelbuild/rules_nodejs/releases/download/0.32.2/rules_nodejs-0.32.2.tar.gz"],
)

load("@build_bazel_rules_nodejs//:defs.bzl", "node_repositories")
```

Now you can choose from a few options to finish installation.

To choose a version of Node.js:

1. (Simplest) use the version of Node.js that comes with these rules by default
1. Choose from one of the versions we support natively
1. Tell Bazel where to download a specific version you require
1. Check Node.js into your repository and don't download anything

These are described in more detail in the following sections.

### Simple usage

Add this to your `WORKSPACE` file. It only tells Bazel how to find your
`package.json` file. It will use default versions of Node.js and npm.

```python
# NOTE: this rule installs nodejs, npm, and yarn, but does NOT install
# your npm dependencies into your node_modules folder.
# You must still run the package manager to do this.
node_repositories(package_json = ["//:package.json"])
```
### Installation with a specific supported version of Node.js and Yarn

You can choose a specific version of Node.js that's built into these rules.
Currently these versions are:

* 10.13.0 (default)
* 10.10.0
* 10.9.0
* 10.3.0
* 9.11.1
* 8.12.0
* 8.11.1
* 8.9.1

You can also choose a specific version of Yarn.
Currently these versions are:
* 1.12.1 (default)
* 1.9.4
* 1.9.2
* 1.6.0
* 1.5.1
* 1.3.2

Add to `WORKSPACE`:

```python
# NOTE: this rule installs nodejs, npm, and yarn, but does NOT install
# your npm dependencies into your node_modules folder.
# You must still run the package manager to do this.
node_repositories(
    package_json = ["//:package.json"],
    node_version = "8.11.1",
    yarn_version = "1.5.1",
)
```

### Installation with a manually specified version of NodeJS and Yarn

If you'd like to use a version of NodeJS and/or Yarn that are not currently supported here, you can manually
specify those in your `WORKSPACE`:

```python
load("@build_bazel_rules_nodejs//:defs.bzl", "node_repositories")

# NOTE: this rule does NOT install your npm dependencies into your node_modules folder.
# You must still run the package manager to do this.
node_repositories(
  node_version = "8.10.0",
  yarn_version = "1.5.1",
  node_repositories = {
    "8.10.0-darwin_amd64": ("node-v8.10.0-darwin-x64.tar.gz", "node-v8.10.0-darwin-x64", "7d77bd35bc781f02ba7383779da30bd529f21849b86f14d87e097497671b0271"),
    "8.10.0-linux_amd64": ("node-v8.10.0-linux-x64.tar.xz", "node-v8.10.0-linux-x64", "92220638d661a43bd0fee2bf478cb283ead6524f231aabccf14c549ebc2bc338"),
    "8.10.0-windows_amd64": ("node-v8.10.0-win-x64.zip", "node-v8.10.0-win-x64", "936ada36cb6f09a5565571e15eb8006e45c5a513529c19e21d070acf0e50321b"),
  },
  yarn_repositories = {
    "1.5.1": ("yarn-v1.5.1.tar.gz", "yarn-v1.5.1", "cd31657232cf48d57fdbff55f38bfa058d2fb4950450bd34af72dac796af4de1"),
  },
  node_urls = ["https://nodejs.org/dist/v{version}/{filename}"],
  yarn_urls = ["https://github.com/yarnpkg/yarn/releases/download/v{version}/{filename}"],
  package_json = ["//:package.json"])
```

Specifying `node_urls` and `yarn_urls` is optional. If omitted, the default values will be used. You may also use a custom NodeJS version and the default Yarn version or vice-versa.

### Installation with local vendored versions of NodeJS and Yarn

Finally, you could check Node.js and Yarn into your repository, and not fetch
them from the internet. This is what we do internally at Google.

```python
load("@build_bazel_rules_nodejs//:defs.bzl", "node_repositories")

# Point node_repositories to use locally installed versions of Node.js and Yarn.
# The vendored_node and vendored_yarn labels point to the extracted contents of
# https://nodejs.org/dist/v10.12.0/node-v10.12.0-linux-x64.tar.xz and
# https://github.com/yarnpkg/yarn/releases/download/v1.10.0/yarn-v1.10.0.tar.gz
# respectively. NOTE: node-v10.12.0-linux-x64 will only work on Linux.
node_repositories(
  vendored_node = "@wksp//:third_party/node-v10.12.0-linux-x64",
  vendored_yarn = "@wksp//:third_party/yarn-v1.10.0",
  package_json = ["//:package.json"])
```

In this case, the locally installed Node.js and Yarn are located in the `wksp` workspace in
the `third_party/node-v10.12.0-linux-x64` and `third_party/yarn-v1.10.0` folders. When using
`vendored_node`, you will be restricted to a single platform. `vendored_yarn` on the other hand,
is platform independent. See `/examples/vendored_node` in this repository for an example of this
in use.

NOTE: Vendored Node.js and Yarn are not compatible with Remote Bazel Execution.

## Dependencies

### Bazel-managed vs self-managed dependencies

You have two options for managing your `node_modules` dependencies: Bazel-managed or self-managed.

With the Bazel-managed dependencies approach, Bazel is responsible for making sure that `node_modules` is
up to date with your `package[-lock].json` or `yarn.lock` files. This means Bazel will set it up when the
repository is first cloned, and rebuild it whenever it changes. With the `yarn_install` or `npm_install`
repository rules, Bazel will setup your `node_modules` for you in an external workspace named after the
repository rule. For example, a `yarn_install(name = "npm", ...)` will setup an external
workspace named `@npm` with the `node_modules` folder inside of it as well as generating targets for each
root npm package in `node_modules` for use as dependencies to other rules.

For Bazel to provide the strongest guarantees about reproducibility and the
fidelity of your build, it is recommended that you use Bazel-managed dependencies.
This approach also allows you to use the generated fine-grained npm package dependencies
which can significantly reduce the number of inputs to actions, making Bazel sand-boxing and
remote-execution faster if there are a large number of files under `node_modules`.

> Note that as of Bazel 0.26, and with the recommended `managed_directories` attribute on the `workspace` rule in `/WORKSPACE`,
> the Bazel-managed `node_modules` directory is placed in your workspace root in the standard location used by npm or yarn.

### Using Bazel-managed dependencies

To have Bazel manage its own copy of `node_modules`, which is useful to avoid
juggling multiple toolchains, you can add one of the following to your `WORKSPACE`
file:

Using Yarn (preferred):

```python
load("@build_bazel_rules_nodejs//:defs.bzl", "yarn_install")

yarn_install(
    name = "npm",
    package_json = "//:package.json",
    yarn_lock = "//:yarn.lock",
)
```

Using NPM:

```python
load("@build_bazel_rules_nodejs//:defs.bzl", "npm_install")

npm_install(
    name = "npm",
    package_json = "//:package.json",
    package_lock_json = "//:package-lock.json",
)
```

> If you don't need to pass any arguments to `node_repositories`,
  you can skip calling that function. `yarn_install` and `npm_install` will do it by default.

You should now add the `@npm` workspace to the `managed_directories` option in the `workspace` rule at the top of the file. This tells Bazel that the `node_modules` directory is special and is managed by the package manager.
Add the `workspace` rule if it isn't already in your `/WORKSPACE` file.

```python
workspace(
    name = "my_wksp",
    managed_directories = {"@npm": ["node_modules"]},
)
```

As of Bazel 0.26 this feature is still experimental, so also add this line to the `.bazelrc` to opt-in:

```
common --experimental_allow_incremental_repository_updates
```

#### yarn_install vs. npm_install

`yarn_install` is the preferred rule for setting up Bazel-managed dependencies for a number of reasons:

* `yarn_install` will use the global yarn cache by default which will improve your build performance (this can be turned off with the `use_global_yarn_cache` attribute)
* npm has a known peer dependency hoisting issue that can lead to missing peer dependencies in some cases (see https://github.com/bazelbuild/rules_nodejs/issues/416)

#### Fine-grained npm package dependencies

You can then reference individual npm packages in your `BUILD` rules via:

```python
load("@build_bazel_rules_nodejs//:defs.bzl", "nodejs_binary")

nodejs_binary(
    name = "bar",
    data = [
      "@npm//foo",
      "@npm//baz",
    ]
    ...
)
```

In this case, the `bar` nodejs_binary depends only the `foo` and `baz` npm packages
and all of their transitive deps.

For other rules such as `jasmine_node_test`, fine grained
npm dependencies are specified in the `deps` attribute:

```python
jasmine_node_test(
    name = "test",
    ...
    deps = [
        "@npm//jasmine",
        "@npm//foo",
        "@npm//baz",
        ...
    ],
)
```

#### Fine-grained npm package nodejs_binary targets

If an npm package lists one or more `bin` entry points in its `package.json`,
`nodejs_binary` targets will be generated for these.

For example, the `protractor` package has two bin entries in its `package.json`:

```json
  "bin": {
    "protractor": "bin/protractor",
    "webdriver-manager": "bin/webdriver-manager"
  },
```

These will result in two generated `nodejs_binary` targets in the `@npm//protractor/bin`
package (if your npm deps workspace is `@npm`):

* `@npm//protractor/bin:protractor`
* `@npm//protractor/bin:webdriver-manager`

These targets can be used as executables for actions in custom rules or can
be run by Bazel directly. For example, you can run protractor with the
following:

```sh
$ bazel run @npm//protractor/bin:protractor
```

Note: These targets are in the `protractor/bin` package so they don't
conflict with the targets to use in deps[]. For example, `@npm//protractor:protractor`
is target to use in deps[] while `@npm//protractor/bin:protractor` is the binary target.

#### Coarse node_modules dependencies

Using fine grained npm dependencies is recommended to minimize
the number of inputs to your rules. However, for backward compatibility
there are also filegroups defined by `yarn_install` and `npm_install`
that include all packages under `node_modules` and which can be used
with the `node_modules` attribute of nodejs rules.

* `@npm//:node_modules` includes all packages under `node_modules` as well as the `.bin` folder

```python
load("@build_bazel_rules_nodejs//:defs.bzl", "nodejs_binary")

nodejs_binary(
    name = "bar",
    node_modules = "@npm//:node_modules",
)
```

### Using self-managed dependencies

If you'd like to have Bazel use the `node_modules` directory you are managing,
then next you will create a `BUILD.bazel` file in your project root containing:

```python
package(default_visibility = ["//visibility:public"])

filegroup(
    name = "node_modules",
    srcs = glob(
        include = ["node_modules/**/*"],
        exclude = [
          # Files under test & docs may contain file names that
          # are not legal Bazel labels (e.g.,
          # node_modules/ecstatic/test/public/中文/檔案.html)
          "node_modules/test/**",
          "node_modules/docs/**",
          # Files with spaces are not allowed in Bazel runfiles
          # See https://github.com/bazelbuild/bazel/issues/4327
          "node_modules/**/* */**",
          "node_modules/**/* *",
        ],
    ),
)
```

The example in `examples/program` uses self-managed dependencies.

To use the Yarn package manager, which we recommend for its built-in
verification command, you can run:

```sh
$ bazel run @nodejs//:yarn
```

If you use npm instead, run:

```sh
$ bazel run @nodejs//:npm install
```

The `@nodejs//:yarn` and `@nodejs//:npm` targets will run yarn/npm on all of the
package.json contexts listed `package_json` attribute of the `node_repositories`
repository rule in your WORKSPACE file (`node_repositories(package_json = [...])`).

If there are multiple package.json contexts in this rule but you would like to
run the bazel managed yarn or npm on a single context this can be done
using the following targets:

```sh
$ bazel run @nodejs//:bin/yarn -- <arguments passed to yarn>
```

If you use npm instead, run:

```sh
$ bazel run @nodejs//:bin/npm -- <arguments passed to npm>
```

Note: on **Windows** the targets are `@nodejs//:bin/yarn.cmd` and `@nodejs//:bin/npm.cmd`.

This will run yarn/npm in the current working directory. To add a package with the `yarn add` command,
for example, you would use:

```sh
$ bazel run @nodejs//:bin/yarn -- add <package>
```

Note: the arguments passed to `bazel run` after `--` are forwarded to the executable being run.

[bazel instructions]: https://docs.bazel.build/versions/master/install.html

### Toolchains

When you add `node_repositories()` to your `WORKSPACE` file it will setup a node toolchain for all currently supported platforms, Linux, macOS and Windows. Amongst other things this adds support for cross-compilations as well as Remote Build Execution support. For more detailed information also see [Bazel Toolchains](https://docs.bazel.build/versions/master/toolchains.html).

If you have an advanced use-case you can also register your own toolchains and call `node_configure` directly to manually setup a toolchain.

#### Cross-compilation

Toolchains allow us to support cross-compilation, e.g. building a linux binary from mac or windows. To tell Bazel to provide a toolchain for a different platform you have to pass in  the `--platforms` flag. Currently supported values are:

- `@build_bazel_rules_nodejs//toolchains/node:linux_amd64`
- `@build_bazel_rules_nodejs//toolchains/node:darwin_amd64`
- `@build_bazel_rules_nodejs//toolchains/node:windows_amd64`

So if for example you want to build a docker image from a non-linux platform you would run `bazel build --platforms=@build_bazel_rules_nodejs//toolchains/node:linux_amd64 //app`, which will ensure that the linux nodejs binary is downloaded and provided to the nodejs_binary target.

Note: The toolchain currently only provides a platform-specific nodejs binary. Any native modules will still be fetched/built, by npm/yarn, for your host platform, so they will not work on the target platform. Support for cross-compilation with native dependencies will follow.

## Usage

### Running a program from npm

The `nodejs_binary` rule lets you run a program with Node.js.
See https://bazelbuild.github.io/rules_nodejs/node/node.html

If you have installed the [rollup] package, you could write this rule:

```python
load("@build_bazel_rules_nodejs//:defs.bzl", "nodejs_binary")

nodejs_binary(
    name = "rollup",
    entry_point = "//:node_modules/rollup/bin/rollup",
)
```

and run it with

```sh
$ bazel run :rollup -- --help
```

[rollup]: https://www.npmjs.com/package/rollup

You can also wrap an npm program with a Bazel rule, making it easy to integrate with a Bazel build.
See the `examples/parcel` example.

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
    entry_point = ":main.js",
    args = ["--node_options=--expose-gc"],
)
```

This example illustrates how to pass arguments to nodejs (as opposed to passing arguments to the program).

The `data` attribute is optional, by default it includes the `node_modules` directory. To include your own
sources, include a file or target that produces JavaScript.

See the `examples/program` directory in this repository.

### Testing

The `examples/program/index.spec.js` file illustrates testing. Another usage is in https://github.com/angular/tsickle/blob/master/test/BUILD

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

# Scope of the project

This repository contains an orthogonal set of rules which covers an opinionated toolchain for JavaScript development. When requesting a new rule, describe your use case, why it's important, and why you can't do it with the existing rules. This is because we have limited resources to maintain additional rules.

The repository accepts contributions in terms of bug fixes or implementing new features in existing rules. If you're planning to implement a new rule, please strongly consider opening a [feature request](https://github.com/bazelbuild/rules_nodejs/issues/new) first so the project's maintainers can decide if it belongs to the scope of this project or not.

For rules outside of the scope of the projects we recommend hosting them in your GitHub account or the one of your organization.

# Design

Most bazel rules include package management. That is, the `WORKSPACE` file installs your dependencies as well as the toolchain. In some environments, this is the normal workflow, for example in Java, Gradle and Maven are each both a build tool and a package manager.

In nodejs, there are a variety of package managers and build tools which can interoperate. Also, there is a well-known package installation location (`node_modules` directory in your project). Command-line and other tools look in this directory to find packages. So we must either download packages twice (risking version skew between them) or point all tools to Bazel's `external` directory with `NODE_PATH` which would be very inconvenient.

Instead, our philosophy is: in the NodeJS ecosystem, Bazel is only a build tool. It is up to the user to install packages into their `node_modules` directory, though the build tool can verify the contents.

## Hermeticity and reproducibility

Bazel generally guarantees builds are correct with respect to their inputs. For example, this means that given the same source tree, you can re-build the same artifacts as an earlier release of your program. In the nodejs rules, Bazel is not the package manager, so some responsibility falls to the developer to avoid builds that use the wrong dependencies. This problem exists with any build system in the JavaScript ecosystem.

Both NPM and Yarn have a lockfile, which ensures that dependencies only change when the lockfile changes. Users are *strongly encouraged* to use the locking mechanism in their package manager.

References:

- npm: https://docs.npmjs.com/files/package-lock.json
- yarn: https://yarnpkg.com/lang/en/docs/yarn-lock/

Note that https://github.com/bazelbuild/rules_nodejs/issues/1 will take the guarantee further: by using the lockfile as an input to Bazel, the nodejs rules can verify the integrity of the dependencies. This would make it impossible for a build to be non-reproducible, so long as you have the same lockfile.

