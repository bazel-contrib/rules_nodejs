# node package linker

It's not obvious why a "linker" is needed in nodejs.
After all, programs use dynamic lookups at runtime so we expect no need for static linking.

However, in the monorepo case, you develop a package and also reference it by name in the same repo.
This means you need a workflow like `npm link` to symlink the package from the `node_modules/name` directory to `packages/name` or wherever the sources live.
[lerna] does a similar thing, but at a wider scale: it links together a bunch of packages using a descriptor file to understand how to map from the source tree to the runtime locations.

Under Bazel, we have exactly this monorepo feature. But, we want users to have a better experience than lerna: they shouldn't need to run any tool other than `bazel test` or `bazel run` and they expect programs to work, even when they `require()` some local package from the monorepo.

To make this seamless, we run a linker as a separate program inside the Bazel action, right before node.
It does essentially the same job as Lerna: make sure there is a `$PWD/node_modules` tree and that all the semantics from Bazel (such as LinkablePackageInfo provider) are mapped to the node module resolution algorithm, so that the node runtime behaves the same way as if the packages had been installed from npm.

Note that the behavior of the linker depends on whether the package to link was declared as:

1. a runtime dependency of a binary run by Bazel, which we call "statically linked", and which is resolved from Bazel's Runfiles tree or manifest
1. a dependency declared by a user of that binary, which we call "dynamically linked", and which is resolved from the execution root

In the future the linker should also generate `package.json` files so that things like `main` and `typings` fields are present and reflect the Bazel semantics, so that we can entirely eliminate custom loading and pathmapping logic from binaries we execute.

[lerna]: https://github.com/lerna/lerna

# Developing

Update checked in generated linker index.js with

```
bazel run //internal/linker:linker_lib_check_compiled.update
```
