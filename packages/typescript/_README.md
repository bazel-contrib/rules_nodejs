# TypeScript rules for Bazel

The TypeScript rules integrate the TypeScript compiler with Bazel.

## Alternatives

This package provides Bazel wrappers around the TypeScript compiler.

At a high level, there are two alternatives provided: `ts_project` and `ts_library`.
This section describes the trade-offs between these rules.

`ts_project` is recommended for all new uses, and we hope to migrate all users to it in the future.
It simply runs `tsc --project`.

The rule ensures that Bazel knows which outputs to expect based on the TypeScript compiler options, and provides interoperability with other TypeScript rules via a Bazel Provider ([DeclarationInfo](Built-ins#declarationinfo)) that transmits the type information.

Advantages of `ts_project` include:
- it's an easy on-boarding for existing TypeScript code and for developers already familiar with using the TypeScript compiler.
- any behavior of `ts_project` should be reproducible outside of Bazel, with a couple of caveats noted in the rule documentation below.
- It's a compact implementation that we can afford to maintain.

> We used to recommend using the `tsc` rule directly from the `typescript` project, like
> `load("@npm//typescript:index.bzl", "tsc")`
> However `ts_project` is strictly better and should be used instead.

**`ts_library` will be deprecated as soon as `ts_project` has performance parity. Thus we do not recommend any new usages**

`ts_library` is an open-sourced version of the rule we use to compile TS code at Google, however it is very complex, involving code generation of the `tsconfig.json` file, a custom compiler binary, and a lot of extra features.

It is also opinionated, and may not work with existing TypeScript code. For example:

- Your TS code must compile under the `--declaration` flag so that downstream libraries depend only on types, not implementation. This makes Bazel faster by avoiding cascading rebuilds in cases where the types aren't changed.
- You cannot use `--noEmit` compiler option to use TypeScript as a linter. We always expect to produce .js outputs.
- We control the output format and module syntax so that downstream rules can rely on them.

On the other hand, `ts_library` is also fast and optimized.
We keep a running TypeScript compile running as a daemon, using Bazel workers.
This process avoids re-parse and re-JIT of the >1MB `typescript.js` and keeps cached bound ASTs for input files which saves time.
We also produce JS code which can be loaded faster (using named AMD module format) and which can be consumed by the Closure Compiler (via integration with [tsickle](https://github.com/angular/tsickle)).

## Installation

Add a `devDependency` on `@bazel/typescript`

```sh
$ yarn add -D @bazel/typescript
# or
$ npm install --save-dev @bazel/typescript
```

Watch for any `peerDependency` warnings - we assume you have already installed the `typescript` package from npm.

### Notes

If you'd like a "watch mode", try [ibazel].

At some point, we plan to release a tool similar to [gazelle] to generate the
BUILD files from your source code.

[gazelle]: https://github.com/bazelbuild/bazel-gazelle
[ibazel]: https://github.com/bazelbuild/bazel-watcher
