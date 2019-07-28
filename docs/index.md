---
title: Home
layout: default
stylesheet: docs
---

# Bazel JavaScript rules

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
