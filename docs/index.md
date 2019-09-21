---
title: Home
layout: default
stylesheet: docs
---

# Bazel JavaScript rules

Bazel is Google's build system.
It powers our development at large scale by caching intermediate build artifacts,
allowing build and test to be incremental and massively parallelizable.
Read more at [https://bazel.build](https://bazel.build)

This JavaScript support lets you build and test code that targets a JavaScript runtime, including NodeJS and browsers.

## Quickstart

This is the fastest way to get started for most use cases.
See [the installation page](install.md) for details and alternative methods.

```sh
$ npm init @bazel
```

or if you prefer yarn,

```sh
$ yarn create @bazel
```

> These commands are equivalent to `npx @bazel/create` which downloads the latest version of the `@bazel/create` package from npm and runs the program contained.

See the output of the tool for command-line options and next steps.

## Usage

### Running a program from npm

The `nodejs_binary` rule lets you run a program with Node.js.
See [Built-ins]

If you have installed the [rollup] package, you could write this rule:

```python
load("@build_bazel_rules_nodejs//:index.bzl", "nodejs_binary")

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
load("@build_bazel_rules_nodejs//:index.bzl", "nodejs_binary")

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

### Debugging

Add the options in the `Support for debugging NodeJS tests` section from https://github.com/bazelbuild/rules_nodejs/blob/master/common.bazelrc to your project's `.bazelrc` file to add support for debugging NodeJS programs.

Using the `--config=debug` command line option with bazel will set a number of flags that are specified there are useful for debugging. See the comments under `Support for debugging NodeJS tests` for details on the flags that are set.

Use  `--config=debug` with `bazel test` as follow,

```
bazel test --config=debug //test:...
```

or with `bazel run`,

```
bazel run --config=debug //test:test1
```

to also turn on the NodeJS inspector agent which will break before any user code starts. You should then see,

```
Executing tests from //test:test1
-----------------------------------------------------------------------------
Debugger listening on ws://127.0.0.1:9229/3f20777a-242c-4d18-b88b-5ed4b3fed61c
For help, see: https://nodejs.org/en/docs/inspector
```

when the test is run.

To inspect with Chrome DevTools 55+, open `chrome://inspect` in a Chromium-based browser and attach to the waiting process.
A Chrome DevTools window should open and you should see `Debugger attached.` in the console.

See https://nodejs.org/en/docs/guides/debugging-getting-started/ for more details.

### Stamping

Bazel is generally only a build tool, and is unaware of your version control system.
However, when publishing releases, you typically want to embed version information in the resulting distribution.
Bazel supports this natively, using the following approach:

First, pass the `workspace_status_command` argument to `bazel build`. We prefer to do this with an entry in `.bazelrc`:

```sh    
# This tells Bazel how to interact with the version control system
# Enable this with --config=release
build:release --workspace_status_command=./tools/bazel_stamp_vars.sh
```

Then create `tools/bazel_stamp_vars.sh`.

This is a script that prints variable/value pairs.
Make sure you set the executable bit, eg. `chmod 755 tools/bazel_stamp_vars.sh`.
For example, we could run `git describe` to get the current tag:

```bash
#!/usr/bin/env bash
echo BUILD_SCM_VERSION $(git describe --abbrev=7 --tags HEAD)
```

For a more full-featured script, take a look at the [bazel_stamp_vars in Angular]

Ideally, `rollup_bundle` and `npm_package` should honor the `--stamp` argument to `bazel build`. However this is not currently possible, see https://github.com/bazelbuild/bazel/issues/1054

Finally, we recommend a release script around Bazel. We typically have more than one npm package published from one Bazel workspace, so we do a `bazel query` to find them, and publish in a loop. Here is a template to get you started:

```sh
#!/usr/bin/env bash

set -u -e -o pipefail

# Call the script with argument "pack" or "publish"
readonly NPM_COMMAND=${1:-publish}
# Don't rely on $PATH to have the right version
readonly BAZEL_BIN=./node_modules/.bin/bazel
# Use a new output_base so we get a clean build
# Bazel can't know if the git metadata changed
readonly TMP=$(mktemp -d -t bazel-release.XXXXXXX)
readonly BAZEL="$BAZEL_BIN --output_base=$TMP"
# Find all the npm packages in the repo
readonly NPM_PACKAGE_LABELS=`$BAZEL query --output=label 'kind("npm_package", //...)'`
# Build them in one command to maximize parallelism
$BAZEL build --config=release $NPM_PACKAGE_LABELS
# publish one package at a time to make it easier to spot any errors or warnings
for pkg in $NPM_PACKAGE_LABELS ; do
  $BAZEL run -- ${pkg}.${NPM_COMMAND} --access public --tag latest
done
```

> WARNING: Bazel can't track changes to git tags. That means it won't rebuild a target if only the result of the workspace_status_command has changed. So changes to the version information may not be reflected if you re-build the package or bundle, and nothing in the package or bundle has changed.

See https://www.kchodorow.com/blog/2017/03/27/stamping-your-builds/ for more background.

[bazel_stamp_vars in Angular]: https://github.com/angular/angular/blob/master/tools/bazel_stamp_vars.sh

# Making changes to rules_nodejs

One advantage of open-source software is that you can make your own changes that suit your needs.

The packages published to npm and GitHub differ from the sources in this repo. The packages have only runtime bazel dependencies, but the sources depend on development dependencies. For example, the `@bazel_skylib` library is a development-time transitive dependency, while an npm package would have that dependency statically linked in.

> This differs from much of the Bazel ecosystem, where you are expected to build the whole transitive toolchain from sources.

If you have a small change, it's easiest to just patch the distributed artifacts rather than build from source. However if you're doing active development in rules_nodejs or have a policy of not depending on release artifacts, it's possible to depend directly on sources. This is not yet documented; file an issue on our repo if you think you need this.

## Patching the npm packages

The pattern we use most commonly is to add a `postinstall` hook to your `package.json` that patches files after they've been fetched from npm.

See `/tools/postinstall-patches.js` in the [Angular repo] for an example.

[Angular repo]: https://github.com/angular/angular/tree/master/tools/postinstall-patches.js

## Patching the built-in release

rules_nodejs has a distribution format which is a tgz published to GitHub, and this can make it tricky to make casual changes without forking the project and building your own release artifacts.

Bazel has a handy patching mechanism that lets you easily apply a local patch to the release artifact for built-in rules: the `patches` attribute to `http_archive`.

First, make your changes in a clone of the rules_nodejs repo. Export a patch file simply using `git diff`:

```sh
git diff > my.patch
```

Then copy the patch file somewhere in your repo and point to it from your `WORKSPACE` file:

```python
http_archive(
    name = "build_bazel_rules_nodejs",
    patch_args = ["-p1"],
    patches = ["//path/to/my.patch"],
    sha256 = "6d4edbf28ff6720aedf5f97f9b9a7679401bf7fca9d14a0fff80f644a99992b4",
    urls = ["https://github.com/bazelbuild/rules_nodejs/releases/download/0.32.2/rules_nodejs-0.32.2.tar.gz"],
)
```

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
