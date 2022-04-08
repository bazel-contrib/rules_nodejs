"""# Toolchains

API docs for [Toolchain](https://docs.bazel.build/versions/main/toolchains.html) support.

When you call `nodejs_register_toolchains()` in your `WORKSPACE` file it will setup a node toolchain for executing tools on all currently supported platforms.

If you have an advanced use-case and want to use a version of node not supported by this repository, you can also register your own toolchains.

## Node.js binary for the target platform

Sometimes your target platform (where your software runs) is different from the host platform (where you run Bazel) or execution platform (where Bazel actions run).
The most common case is developing a docker image on MacOS, which will execute in a Linux container.

Our toolchain support is conditional on the execution platform, as it's meant for running nodejs tools during the build.
It is not needed for this use case. Instead, simply select the nodejs you want to include in the runtime.

For example, rules_docker has a `nodejs_image` rule, which takes a `node_repository_name` attribute indicating
which nodejs binary you want to include in the image. `nodejs_linux_amd64` is the value you'd use.

## Cross-compilation

Bazel Toolchains are intended to support cross-compilation, e.g. building a linux binary from mac or windows.
Most JavaScript use cases produce platform-independent code,
but the exception is native modules which use [node-gyp](https://github.com/nodejs/node-gyp).
Any native modules will still be fetched and built, by npm/yarn, for your host platform,
so they will not work on the target platform.
The workaround is to perform the npm_install inside a docker container so that it produces modules for the target platform.

Follow https://github.com/bazelbuild/rules_nodejs/issues/506 for updates on support for node-gyp cross-compilation.

## Registering a custom toolchain

To run a custom toolchain (i.e., to run a node binary not supported by the built-in toolchains), you'll need four things:

1) A rule which can build or load a node binary from your repository
   (a checked-in binary or a build using a relevant [`rules_foreign_cc` build rule](https://bazelbuild.github.io/rules_foreign_cc/) will do nicely).
2) A [`node_toolchain` rule](Core.html#node_toolchain) which depends on your binary defined in step 1 as its `target_tool`.
3) A [`toolchain` rule](https://bazel.build/reference/be/platform#toolchain) that depends on your `node_toolchain` rule defined in step 2 as its `toolchain`
   and on `@rules_nodejs//nodejs:toolchain_type` as its `toolchain_type`. Make sure to define appropriate platform restrictions as described in the
   documentation for the `toolchain` rule.
4) A call to [the `register_toolchains` function](https://bazel.build/rules/lib/globals#register_toolchains) in your `WORKSPACE`
   that refers to the `toolchain` rule defined in step 3.

Examples of steps 2-4 can be found in the [documentation for `node_toolchain`](Core.html#node_toolchain).

If necessary, you can substitute building the node binary as part of the build with using a locally installed version by skipping step 1 and replacing step 2 with:

2) A `node_toolchain` rule which has the path of the system binary as its `target_tool_path`
"""

load("//toolchains/cypress:cypress_repositories.bzl", _cypress_repositories = "cypress_repositories")
load("//toolchains/cypress:cypress_toolchain.bzl", _cypress_toolchain = "cypress_toolchain")
load("//toolchains/esbuild:esbuild_repositories.bzl", _esbuild_repositories = "esbuild_repositories")
load("//toolchains/esbuild:toolchain.bzl", _configure_esbuild_toolchains = "configure_esbuild_toolchains")

cypress_repositories = _cypress_repositories
cypress_toolchain = _cypress_toolchain
esbuild_repositories = _esbuild_repositories
configure_esbuild_toolchains = _configure_esbuild_toolchains
