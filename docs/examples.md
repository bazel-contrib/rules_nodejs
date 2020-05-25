---
title: Examples
layout: default
stylesheet: docs
---

# Frameworks

## Angular

Bazel can run any toolchain you want, so there is more than one way to use it with Angular.
See Alex's post [Angular ❤️ Bazel update](https://dev.to/bazel/angular-bazel-update-n33-temp-slug-9563533?preview=d98c4fd0c1ad788b7f3e01eaf716c5b249d68b976a8697d07815023747be3b8f3277c2b182df7682a4efb81fac76056244b3ce9f7445110c70971bf8) for a longer explanation.

**Architect**: The first approach is the simplest: use Architect (aka. Angular CLI Builders). This is the build tool inside of Angular CLI, so your existing application will continue to work the same way. However, it has the worst performance because the level of incrementality is only as fine as how many libs your application is composed from.

Example: [examples/angular_bazel_architect](https://github.com/bazelbuild/rules_nodejs/tree/master/examples/angular_bazel_architect)

**Google**: This toolchain is what we originally advertised as "Angular, Bazel and CLI" (ABC). It is based on Google's internal toolchain for building Angular, and has good performance characteristics. However it is harder to migrate to, because it doesn't have good compatibility for existing applications.

The example has its own guide: [examples/angular](https://github.com/bazelbuild/rules_nodejs/tree/master/examples/angular)

**View Engine**: If you're stuck on the older Angular compiler/runtime before Ivy, called View Engine, then your options are more limited. We don't support Angular 9 + View Engine + Bazel.

Example: [examples/angular_view_engine](https://github.com/bazelbuild/rules_nodejs/tree/master/examples/angular_view_engine)

## React

There is a basic example at [examples/react_webpack](https://github.com/bazelbuild/rules_nodejs/tree/master/examples/react_webpack)

We are likely to add more, as the rules_nodejs core maintainers are working on some React projects.

## Vue

We don't have a dedicated example yet, but Vue has been known to work. Follow https://github.com/bazelbuild/rules_nodejs/issues/1840 for an example.

## Svelte

None yet, please file an issue if you need this.

# Test Runners

## Jest

There is a dedicated example for Jest: [examples/jest](https://github.com/bazelbuild/rules_nodejs/tree/master/examples/jest)

## Cypress

We have done some early work to run Cypress under Bazel. Follow https://github.com/bazelbuild/rules_nodejs/issues/1904 for an example.

## Mocha

Example at [examples/webapp](https://github.com/bazelbuild/rules_nodejs/tree/master/examples/webapp) has a simple `mocha_test`

## Karma and Protractor

See Protractor usage in [examples/app](https://github.com/bazelbuild/rules_nodejs/blob/master/examples/app/)

# Bundlers

## Webpack

See [examples/react_webpack](https://github.com/bazelbuild/rules_nodejs/tree/master/examples/react_webpack)

## Rollup

The example at [examples/webapp](https://github.com/bazelbuild/rules_nodejs/tree/master/examples/webapp) uses Rollup, and produces an app with ES5 and ES2015 variants ("differential loading") that gives faster loading in modern browsers without dropping support for legacy ones.

## Parcel

The example in [examples/parcel](https://github.com/bazelbuild/rules_nodejs/tree/master/examples/parcel) shows how to write a custom rule, it happens to use the parcel binary to build. It's a very minimal example but might be enough to get you started. 

# Language tooling

## LESS, Sass, Stylus

See styles directory inside the [examples/app](https://github.com/bazelbuild/rules_nodejs/tree/master/examples/app/styles) example.

## TypeScript

Most of the examples show TypeScript usage. Also look in [packages/typescript/test](https://github.com/bazelbuild/rules_nodejs/tree/master/packages/typescript/test) for lots of handling of edge cases.

## Kotlin

The Kotlin language can compile to JS. The result has a very large stdlib JS payload, so we don't recommend this for most uses.

Example at [examples/kotlin](https://github.com/bazelbuild/rules_nodejs/tree/master/examples/kotlin)

## Google Closure Compiler

[rules_closure](https://github.com/bazelbuild/rules_closure) is a whole-cloth approach to using Bazel if you're fully bought-into the Closure ecosystem.

[examples/closure](https://github.com/bazelbuild/rules_nodejs/tree/master/examples/closure) shows a very simple way to call the closure compiler without jumping into that ecosystem.

## Protocol Buffers and gRPC

Note: this is considered a "labs" feature in rules_nodejs, so support and stability are not great. gRPC is still a WIP.

See [examples/protocol_buffers](https://github.com/bazelbuild/rules_nodejs/tree/master/examples/protocol_buffers)

# Bazel-specific

## Bazel Persistent Workers

If you want to speed up Bazel by keeping some tools running warm in the background as daemons, there's a good readme in the [examples/worker](https://github.com/bazelbuild/rules_nodejs/tree/master/examples/worker)
