---
title: Examples
layout: default
toc: true
---
# Examples

> 🚨 rules_nodejs is now mostly unmaintained! 🚨
>
> See the Maintenance Update in the [root README](https://github.com/bazelbuild/rules_nodejs#maintenance-update)

## Frameworks

### Angular

Bazel can run any toolchain you want, so there is more than one way to use it with Angular.
See Alex's post [Angular ❤️ Bazel update](https://dev.to/bazel/angular-bazel-leaving-angular-labs-51ja) for a longer explanation.

**Architect**: The first approach is the simplest: use Architect (aka. Angular CLI Builders). This is the build tool inside of Angular CLI, so your existing application will continue to work the same way, and you can still get support from the Angular team. This may be a good choice if your goal is just to include an Angular app in a full-stack Bazel build that includes your backend, and making the Angular build&test faster is not important for you.

However, it has the worst performance because the level of incrementality is only as fine as how many libs your application is composed from.
Bazel can only make a build more parallel and incremental if you express a wider dependency graph to it.

Example: [examples/angular_bazel_architect](https://github.com/bazelbuild/rules_nodejs/tree/stable/examples/angular_bazel_architect)

**Google**: This toolchain is what we originally advertised as "Angular Buildtools Convergence" (ABC). It is based on Google's internal toolchain for building Angular, and has good performance characteristics. However it is harder to migrate to, because it doesn't have good compatibility for existing applications.

The example has its own guide: [examples/angular](https://github.com/bazelbuild/rules_nodejs/tree/stable/examples/angular)

**Custom**: Bazel is excellent for advanced use cases where you need to customize your toolchain.
Take any off-the-shelf tools, follow their README's to call their CLI, and assemble them together in a custom way.
This lets you take advantage of the latest JS ecosystem innovations without waiting for tooling vendors to
assemble it all together for you.

### React

Similar to the explanation above for Angular, Bazel is agnostic to what tools you choose to run on your project.
However, the benefits of using Bazel are unlocked as you adopt it as your build system.
We think the following examples show a typical migration of adopting Bazel:

**create-react-app**: If you run `create-react-app`, it will install a build system called `react-scripts`.
As a first step into Bazel, you can simply ask Bazel to wrap the existing build system.
This guarantees compatibility with your current code, and if your objective is just to include a frontend app into
a bigger full-stack Bazel build, this might be the final step in the migration.
However it will run `react-scripts` as a single Bazel action, which means that you gain no incrementality benefit.
So we expect for most applications this is just a first step.

The [create-react-app example](https://github.com/bazelbuild/rules_nodejs/tree/stable/examples/create-react-app)
shows how this will look. We suggest reading the README in that example, and also look at the commit history to that
directory as an illustration of how we started from create-react-app and added Bazel bits.

**react-scripts-like**: As a next step to make our Build more incremental and performant, we can replace the `react-scripts` build system with Bazel, but preserve compatibility as much as possible by having Bazel run
mostly the same tools with mostly identical configuration. We continue to transpile TS to JS using Babel, for example,
but we do it in a build step before invoking Webpack, just using the Babel CLI.

This is a good middle ground to get some benefits from Bazel while staying on the same supported tools as react-scripts.

TODO(alexeagle): build an example illustrating how this looks

**custom**: If you really know your JS build tools, Bazel is the perfect way to assemble all the myriad individual tools
into a custom toolchain. This allows you to unlock any part of the JS ecosystem without waiting for it to be integrated
for you by maintainers of a project like create-react-app, who have a very high bar for adding features since the
maintenance and support burden falls on them. However you'll need to understand both the tools as well as Bazel to
successfully build your own toolchain.

There is a basic example at [examples/react_webpack](https://github.com/bazelbuild/rules_nodejs/tree/stable/examples/react_webpack) but it needs a lot more work to show everything that is possible!

### Vue

We don't have a dedicated example yet, but Vue has been known to work. Follow <https://github.com/bazelbuild/rules_nodejs/issues/1840> for an example.

### Svelte

None yet, please file an issue if you need this.

## Test Runners

### Jest

There is a dedicated example for Jest: [examples/jest](https://github.com/bazelbuild/rules_nodejs/tree/stable/examples/jest)

### Mocha

Example at [examples/webapp](https://github.com/bazelbuild/rules_nodejs/tree/stable/examples/webapp) has a simple `mocha_test`

### Karma and Protractor

See Protractor usage in [examples/app](https://github.com/bazelbuild/rules_nodejs/blob/master/examples/app/)

## Bundlers

### Webpack

See [examples/react_webpack](https://github.com/bazelbuild/rules_nodejs/tree/stable/examples/react_webpack)

### Parcel

The example in [examples/parcel](https://github.com/bazelbuild/rules_nodejs/tree/stable/examples/parcel) shows how to write a custom rule, it happens to use the parcel binary to build. It's a very minimal example but might be enough to get you started. 

## Language tooling

### LESS, Sass, Stylus

See styles directory inside the [examples/app](https://github.com/bazelbuild/rules_nodejs/tree/stable/examples/app/styles) example.

### TypeScript

Most of the examples show TypeScript usage. Also look in [packages/typescript/test](https://github.com/bazelbuild/rules_nodejs/tree/stable/packages/typescript/test) for lots of handling of edge cases.

### Kotlin

The Kotlin language can compile to JS. The result has a very large stdlib JS payload, so we don't recommend this for most uses.

Example at [examples/kotlin](https://github.com/bazelbuild/rules_nodejs/tree/stable/examples/kotlin)

### Google Closure Compiler

[rules_closure](https://github.com/bazelbuild/rules_closure) is a whole-cloth approach to using Bazel if you're fully bought-into the Closure ecosystem.

[examples/closure](https://github.com/bazelbuild/rules_nodejs/tree/stable/examples/closure) shows a very simple way to call the closure compiler without jumping into that ecosystem.

### Protocol Buffers and gRPC

rules_nodejs doesn't provide any support for protos or gRPC.
Even outside Bazel, there are many alternative implementations for them, all the way from protoc plugins, code generation, type-checking, and runtime support.
Under Bazel there are many options for each of these, and they don't have good compatibility with each other.

Sadly Google isn't driving the ecosystem to shared solutions, so there is tremendous fragmentation. This isn't a problem rules_nodejs can solve with the resources we have.
We can't even provide useful guidance about which alternatives to use.

<https://github.com/stackb/rules_proto> is undergoing a rewrite to version 2.
Check for a BazelCon 2021 talk by @pcj about it.

<https://github.com/rules-proto-grpc/rules_proto_grpc> is a fork of stackb/rules_proto that has become popular.

<https://github.com/Dig-Doug/rules_typescript_proto> seems promising.

[protobuf.js](https://github.com/protobufjs/protobuf.js) from <https://github.com/dcodeIO> is a simple alternative.
See the example in [examples/protobufjs](https://github.com/bazelbuild/rules_nodejs/tree/stable/examples/protobufjs)

## Bazel-specific

### Bazel Persistent Workers

If you want to speed up Bazel by keeping some tools running warm in the background as daemons, there's a good readme in the [examples/worker](https://github.com/bazelbuild/rules_nodejs/tree/stable/examples/worker)
