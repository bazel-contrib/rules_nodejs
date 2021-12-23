---
title: Patching changes to rules_nodejs
layout: default
toc: true
---

# Patching changes

One advantage of open-source software is that you can make your own changes that suit your needs.

The `@rules_nodejs` module can simply be fetched from sources in place of the published distribution.
For example, in place of

```starlark
http_archive(
    name = "rules_nodejs",
    sha256 = "...",
    urls = ["https://github.com/bazelbuild/rules_nodejs/releases/download/5.0.0/rules_nodejs-core-5.0.0.tar.gz"],
)
```

you can just use a commit from your fork:

```starlark
http_archive(
    name = "rules_nodejs",
    sha256 = "...",
    strip_prefix = "rules_nodejs-abcd123",
    url = "https://github.com/my-org/rules_nodejs/archive/abcd123.tar.gz",
)
```

The `@build_bazel_rules_nodejs` module distributed on GitHub releases is harder to work with.
It has different content from the sources in this repo.
This is true for packages published to `@bazel/` on npm as well.
These packages have only runtime bazel dependencies, but the sources depend on development dependencies. For example, the `@bazel_skylib` library is a development-time transitive dependency, while an npm package would have that dependency statically linked in.

If you have a small change, it's easiest to just patch the distributed artifacts rather than build from source. However if you're doing active development in rules_nodejs or have a policy of not depending on release artifacts, it's possible to depend directly on sources. This is not yet documented; file an issue on our repo if you think you need this.

## Patching the npm packages

The pattern we use most commonly is to use [patch-package]. To store your local changes to the npm packages follow the steps:

1. `npm i -D patch-package`
1. Edit the target package in your `node_modules`
1. Run `npx patch-package <npm package>`. This will store the patch in the `patches/` directory in the root of the workspace
1. Add `"postinstall": "patch-package"` to the `package.json` in your repo to apply the patches when building dependencies (aka at `npm install`)

[patch-package]: https://www.npmjs.com/package/patch-package

## Patching the build_bazel_rules_nodejs release

`build_bazel_rules_nodejs` has a distribution format which is a tgz published to GitHub, and this can make it tricky to make casual changes without forking the project and building your own release artifacts.

Bazel has a handy patching mechanism that lets you easily apply a local patch to the release artifact for built-in rules: [the `patches` attribute to `http_archive`](https://docs.bazel.build/versions/master/repo/http.html#attributes).

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
