---
title: Installation
layout: default
toc: true
---

# Installation

First, you need Bazel.
We recommend using Bazelisk, which is a version-selection wrapper, similar to
the `nvm` tool managing your version of Node. This is available on npm.
We also recommend installing `ibazel` which is the "watch mode" for Bazel.

```sh
$ yarn add -D @bazel/bazelisk @bazel/ibazel
# or
$ npm install --save-dev @bazel/bazelisk @bazel/ibazel
```

You could install a current bazel distribution, following the [bazel instructions](https://docs.bazel.build/versions/main/install.html).

If you use Bazelisk, see [this workaround](https://github.com/bazelbuild/bazelisk/issues/29#issuecomment-478062147) to get working command-line completion.

It's reasonable to globally-install bazelisk so you get a `bazel` command in your $PATH.
We don't recommend this with ibazel as the version is frequently changing.

Next, create a `WORKSPACE` file in your project root (or edit the existing one)
containing:

```python
load("@bazel_tools//tools/build_defs/repo:http.bzl", "http_archive")
http_archive(
    name = "build_bazel_rules_nodejs",
    sha256 = "cfc289523cf1594598215901154a6c2515e8bf3671fd708264a6f6aefe02bf39",
    urls = ["https://github.com/bazelbuild/rules_nodejs/releases/download/4.4.6/rules_nodejs-4.4.6.tar.gz"],
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

## Simple usage

Add this to your `WORKSPACE` file. It only tells Bazel how to find your
`package.json` file. It will use default versions of Node.js and npm.

```python
# NOTE: this rule installs nodejs, npm, and yarn, but does NOT install
# your npm dependencies into your node_modules folder.
# You must still run the package manager to do this.
node_repositories(package_json = ["//:package.json"])
```
## Installation with a specific supported version of Node.js and Yarn

You can choose a specific version of Node.js that's built into these rules.
You can also choose a specific version of Yarn.
Note that some of our packages have started to use features from Node 12, so you may see warnings if you use an older version.

> Now that Node 12 is LTS (Long-term support) we encourage you to upgrade, and don't intend to fix bugs which are only observed in Node 10 or lower.

The available versions are documented on the `node_repositories` rule in the [Built-ins](Built-ins).

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

## Installation with a manually specified version of NodeJS and Yarn

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

## Installation with local vendored versions of NodeJS and Yarn

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

## Toolchains

When you add `node_repositories()` to your `WORKSPACE` file it will setup a node toolchain for all currently supported platforms, Linux, macOS and Windows. Amongst other things this adds support for cross-compilations as well as Remote Build Execution support. For more detailed information also see [Bazel Toolchains](https://docs.bazel.build/versions/master/toolchains.html).

If you have an advanced use-case you can also register your own toolchains and call `node_toolchain_configure` directly to manually setup a toolchain.

### Cross-compilation

Toolchains allow us to support cross-compilation, e.g. building a linux binary from mac or windows. To tell Bazel to provide a toolchain for a different platform you have to pass in  the `--platforms` flag. Currently supported values are:

- `@build_bazel_rules_nodejs//toolchains/node:linux_amd64`
- `@build_bazel_rules_nodejs//toolchains/node:linux_arm64`
- `@build_bazel_rules_nodejs//toolchains/node:linux_s390x`
- `@build_bazel_rules_nodejs//toolchains/node:linux_ppc64le`
- `@build_bazel_rules_nodejs//toolchains/node:darwin_amd64`
- `@build_bazel_rules_nodejs//toolchains/node:windows_amd64`

So if for example you want to build a docker image from a non-linux platform you would run `bazel build --platforms=@build_bazel_rules_nodejs//toolchains/node:linux_amd64 //app`, which will ensure that the linux nodejs binary is downloaded and provided to the nodejs_binary target.

Note: The toolchain currently only provides a platform-specific nodejs binary. Any native modules will still be fetched/built, by npm/yarn, for your host platform, so they will not work on the target platform. Support for cross-compilation with native dependencies will follow.

Because these rules use the target platform to decide which node binary to use, you will run into trouble if you are trying to invoke these rules as part of a cross-compilation
to a platform that is not supported by the default node repositories, eg when trying to bundle some js products into a binary targeting Android or iOS. You can work around this
by defining your own toolchain, and specifying the host platform as an execution requirement instead. For example, if you are building on a Mac, you could add the following
to your workspace:

    register_toolchains("//node_toolchain")

And the following in node_toolchain/BUILD.bazel:

    toolchain(
        name = "node_toolchain",
        exec_compatible_with = [
            "@platforms//os:osx",
            "@platforms//cpu:x86_64",
        ],
        toolchain = "@nodejs_darwin_amd64_config//:toolchain",
        toolchain_type = "@build_bazel_rules_nodejs//toolchains/node:toolchain_type",
    )
