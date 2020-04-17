---
title: Installation
layout: default
stylesheet: docs
---

## Custom installation

First, you need Bazel.
We recommend using Bazelisk, which is a version-selection wrapper, similar to
the `nvm` tool managing your version of Node. This is available on npm.
We also recommend installing `ibazel` which is the "watch mode" for Bazel.

```sh
$ yarn add -D @bazel/bazelisk @bazel/ibazel
# or
$ npm install --save-dev @bazel/bazelisk @bazel/ibazel
```

> You could install a current bazel distribution, following the [bazel instructions].

> If you use Bazelisk, see [this workaround](https://github.com/bazelbuild/bazelisk/issues/29#issuecomment-478062147) to get working command-line completion.

> It's reasonable to globally-install bazelisk so you get a `bazel` command in your $PATH.
> We don't recommend this with ibazel as the version is frequently changing.

Next, create a `WORKSPACE` file in your project root (or edit the existing one)
containing:

```python
load("@bazel_tools//tools/build_defs/repo:http.bzl", "http_archive")
http_archive(
    name = "build_bazel_rules_nodejs",
    sha256 = "f9e7b9f42ae202cc2d2ce6d698ccb49a9f7f7ea572a78fd451696d03ef2ee116",
    urls = ["https://github.com/bazelbuild/rules_nodejs/releases/download/1.6.0/rules_nodejs-1.6.0.tar.gz"],
)

load("@build_bazel_rules_nodejs//:index.bzl", "node_repositories")
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
You can also choose a specific version of Yarn.
Note that some of our packages have started to use features from Node 12, so you may see warnings if you use an older version.

> Now that Node 12 is LTS (Long-term support) we encourage you to upgrade, and don't intend to fix bugs which are only observed in Node 10 or lower.

The available versions are documented on the `node_repositories` rule in the [Built-ins](Built-ins.md).

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
load("@build_bazel_rules_nodejs//:index.bzl", "node_repositories")

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
load("@build_bazel_rules_nodejs//:index.bzl", "node_repositories")

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

Bazel works alongside your existing package manager, either npm or yarn.
You manage your `package.json` file, editing by hand or by running commands like `npm install` or `yarn add`.
The package manager will also write a lock file, indicating exact versions for all transitive dependencies, which keeps your build hermetic and reproducible.
Bazel will run the package manager when the `package.json` or `*lock.json` files change, but you can also run the package manager yourself.

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

#### yarn_install vs. npm_install

`yarn_install` is the preferred rule for setting up Bazel-managed dependencies for a number of reasons:

* `yarn_install` will use the global yarn cache by default which will improve your build performance (this can be turned off with the `use_global_yarn_cache` attribute)
* npm has a known peer dependency hoisting issue that can lead to missing peer dependencies in some cases (see https://github.com/bazelbuild/rules_nodejs/issues/416)

#### Fine-grained npm package dependencies

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

#### Multiple sets of npm dependencies

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
load("@build_bazel_rules_nodejs//:index.bzl", "nodejs_binary")

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

### Toolchains

When you add `node_repositories()` to your `WORKSPACE` file it will setup a node toolchain for all currently supported platforms, Linux, macOS and Windows. Amongst other things this adds support for cross-compilations as well as Remote Build Execution support. For more detailed information also see [Bazel Toolchains](https://docs.bazel.build/versions/master/toolchains.html).

If you have an advanced use-case you can also register your own toolchains and call `node_toolchain_configure` directly to manually setup a toolchain.

#### Cross-compilation

Toolchains allow us to support cross-compilation, e.g. building a linux binary from mac or windows. To tell Bazel to provide a toolchain for a different platform you have to pass in  the `--platforms` flag. Currently supported values are:

- `@build_bazel_rules_nodejs//toolchains/node:linux_amd64`
- `@build_bazel_rules_nodejs//toolchains/node:darwin_amd64`
- `@build_bazel_rules_nodejs//toolchains/node:windows_amd64`

So if for example you want to build a docker image from a non-linux platform you would run `bazel build --platforms=@build_bazel_rules_nodejs//toolchains/node:linux_amd64 //app`, which will ensure that the linux nodejs binary is downloaded and provided to the nodejs_binary target.

Note: The toolchain currently only provides a platform-specific nodejs binary. Any native modules will still be fetched/built, by npm/yarn, for your host platform, so they will not work on the target platform. Support for cross-compilation with native dependencies will follow.
