---
title: Installation
layout: default
toc: true
---

# Installation

First, you need Bazel.
We recommend using Bazelisk, which is a version-selection wrapper, similar to
the `nvm` tool managing your version of Node.

It's reasonable to globally-install bazelisk so you get a `bazel` command in your PATH.
(We don't recommend this with ibazel as the version is frequently changing.)

```sh
$ npm install -g @bazel/bazelisk
```

We also recommend installing `ibazel` which is the "watch mode" for Bazel.

```sh
$ npm install --save-dev @bazel/ibazel
```

> If you use Bazelisk, see [this workaround](https://github.com/bazelbuild/bazelisk/issues/29#issuecomment-478062147) to get working command-line completion.

Next, create a `WORKSPACE` file in your project root (or edit the existing one)
containing:

```python
load("@bazel_tools//tools/build_defs/repo:http.bzl", "http_archive")
http_archive(
    name = "build_bazel_rules_nodejs",
    sha256 = "b011d6206e4e76696eda8287618a2b6375ff862317847cdbe38f8d0cd206e9ce",
    urls = ["https://github.com/bazelbuild/rules_nodejs/releases/download/5.6.0/rules_nodejs-5.6.0.tar.gz"],
)

load("@build_bazel_rules_nodejs//:repositories.bzl", "build_bazel_rules_nodejs_dependencies")

build_bazel_rules_nodejs_dependencies()
```

Now you can choose from a few options to finish installation.

To choose a version of Node.js:

1. (Simplest) use the version of Node.js that comes with these rules by default
1. Choose from one of the versions we support natively
1. Tell Bazel where to download a specific version you require
1. Vendor Node.js into your repository or build it from sources, using a custom toolchain.

These are described in more detail in the following sections.

## Simple usage

Add this to your `WORKSPACE` file to use default versions of Node.js and npm.

```python
# fetches nodejs, npm, and yarn
load("@build_bazel_rules_nodejs//:index.bzl", "node_repositories")
node_repositories()
```

## Installation with a specific version of Node.js and Yarn

You can choose a specific version of Node.js and a specific version of Yarn. We mirror all published versions, which you can see in this repo at `/nodejs/private/yarn_versions.bzl` and `/nodejs/private/node_versions.bzl`.

> Now that Node 12 is LTS (Long-term support) we encourage you to upgrade, and don't intend to fix bugs which are only observed in Node 10 or lower.
> Some of our packages have started to use features from Node 12, so you may see warnings if you use an older version.

Add to `WORKSPACE`:

```python
node_repositories(
    node_version = "8.11.1",
    yarn_version = "1.5.1",
)
```

## Installation with a manually specified version of NodeJS and Yarn

If you'd like to use a version of NodeJS and/or Yarn that are not currently supported here,
for example one that you host within your org, you can manually specify those in your `WORKSPACE`:

```python
load("@build_bazel_rules_nodejs//:index.bzl", "node_repositories")

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
```

Specifying `node_urls` and `yarn_urls` is optional. If omitted, the default values will be used. You may also use a custom NodeJS version and the default Yarn version or vice-versa.

## Installation with local vendored versions of NodeJS and Yarn

You can use your own Node.js binary rather than fetching from the internet.
You could check in a binary file, or build Node.js from sources.
To use See [`node_toolchain`](./Core.md#node_toolchain) for docs.

To use a locally vendored Yarn, use the `vendored_yarn` attribute of [`node_repositories`](./Core.md#node_repositories)

See `/examples/vendored_node_and_yarn` in this repository for an example of this in use.
