<!-- *********************
title: Making changes to rules_nodejs
toc: true
nav: page
ordinality: 4
********************* -->

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
