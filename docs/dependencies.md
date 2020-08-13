---
title: Dependencies
layout: default
toc: true
---

# Dependencies

Bazel works alongside your existing package manager, either npm or yarn.
You manage your `package.json` file, editing by hand or by running commands like `npm install` or `yarn add`.
The package manager will also write a lock file, indicating exact versions for all transitive dependencies, which keeps your build hermetic and reproducible.
Bazel will run the package manager when the `package.json` or `*lock.json` files change, but you can also run the package manager yourself.

## Bazel-managed vs self-managed dependencies

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

## Using Bazel-managed dependencies

To have Bazel manage its own copy of `node_modules`, which is useful to avoid
juggling multiple toolchains, you can add one of the following to your `WORKSPACE`
file:

Using Yarn (preferred):

```python
load("@build_bazel_rules_nodejs//:index.bzl", "yarn_install")

yarn_install(
    name = "npm",
    package_json = "//:package.json",
    yarn_lock = "//:yarn.lock",
)
```

Using NPM:

```python
load("@build_bazel_rules_nodejs//:index.bzl", "npm_install")

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

### yarn_install vs. npm_install

`yarn_install` is the preferred rule for setting up Bazel-managed dependencies for a number of reasons:

* `yarn_install` will use the global yarn cache by default which will improve your build performance (this can be turned off with the `use_global_yarn_cache` attribute)
* npm has a known peer dependency hoisting issue that can lead to missing peer dependencies in some cases (see https://github.com/bazelbuild/rules_nodejs/issues/416)

### Fine-grained npm package dependencies

You can then reference individual npm packages in your `BUILD` rules via:

```python
load("@build_bazel_rules_nodejs//:index.bzl", "nodejs_binary")

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

### Multiple sets of npm dependencies

If your workspace has multiple applications, each with their own `package.json`
and npm deps, `yarn_install` (or `npm_install`) can be called separately for
each.

```python
workspace(
    name = "my_wksp",
    managed_directories = {
        "@app1_npm": ["app1/node_modules"],
        "@app2_npm": ["app2/node_modules"],
    },
)

yarn_install(
    name = "app1_npm",
    package_json = "//app1:package.json",
    yarn_lock = "//app1:yarn.lock",
)

yarn_install(
    name = "app2_npm",
    package_json = "//app2:package.json",
    yarn_lock = "//app2:yarn.lock",
)
```

Your application would then reference its deps as (for example) `@app1_npm//lodash`, or `@app2_npm//jquery`.

### Fine-grained npm package nodejs_binary targets

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

### Coarse node_modules dependencies

Using fine grained npm dependencies is recommended to minimize
the number of inputs to your rules. However, for backward compatibility
there are also filegroups defined by `yarn_install` and `npm_install`
that include all packages under `node_modules` and which can be used
with the `node_modules` attribute of nodejs rules.

* `@npm//:node_modules` includes all packages under `node_modules` as well as the `.bin` folder

```python
load("@build_bazel_rules_nodejs//:index.bzl", "nodejs_binary")

nodejs_binary(
    name = "bar",
    node_modules = "@npm//:node_modules",
)
```

## Using self-managed dependencies

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

The example in `examples/user_managed_deps` uses self-managed dependencies.

To use the Yarn package manager, which we recommend for its built-in
verification command, you can run:

```sh
$ bazel run @nodejs//:yarn_node_repositories
```

If you use npm instead, run:

```sh
$ bazel run @nodejs//:npm_node_repositories install
```

The `@nodejs//:yarn_node_repositories` and `@nodejs//:npm_node_repositories` targets will run yarn/npm on all of the
package.json contexts listed `package_json` attribute of the `node_repositories`
repository rule in your WORKSPACE file (`node_repositories(package_json = [...])`).

If there are multiple package.json contexts in this rule but you would like to
run the bazel managed yarn or npm on a single context this can be done
using the following targets:

```sh
$ bazel run @nodejs//:yarn -- <arguments passed to yarn>
```

If you use npm instead, run:

```sh
$ bazel run @nodejs//:npm -- <arguments passed to npm>
```

This will run yarn/npm in the current working directory. To add a package with the `yarn add` command,
for example, you would use:

```sh
$ bazel run @nodejs//:yarn -- add <package>
```

Note: the arguments passed to `bazel run` after `--` are forwarded to the executable being run.

[bazel instructions]: https://docs.bazel.build/versions/master/install.html
