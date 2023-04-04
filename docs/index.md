---
title: Home
layout: default
toc: true
---

# Bazel JavaScript rules

Bazel rules to build and test code that targets a JavaScript runtime, including NodeJS and browsers.

> 🚨 rules_nodejs is now mostly unmaintained! 🚨
>
> See the Maintenance Update in the [root README](https://github.com/bazelbuild/rules_nodejs#maintenance-update)

## Scope of the project

This repository contains three layers:

1. The `@rules_nodejs` Bazel module, also referred to as the "core".
This contains a toolchain that fetches a hermetic node, npm, and yarn (independent of what's on the developer's machine),
and Bazel Providers to allow interop between JS rules.
It is currently useful for Bazel Rules developers who want to make their own JavaScript support, and
is maintained by community volunteers from [Aspect](https://aspect.dev).
    - [Install and setup](install.md)
    - [Rules API](Core.md)
    - [Toolchains](Toolchains.md)

2. The `@build_bazel_rules_nodejs` Bazel module depends on the `@rules_nodejs` module.
**There are currently no maintainers of this module, so it is effectively deprecated.**
See the notes in the repository's main README.md.
This module gives the ability to install third-party dependencies using npm or yarn.
`BUILD` files are generated so that Bazel can load the third-party dependency graph and can call the CLI of installed tools.
It also supports running Node.js programs and has a number of useful rules.
    - [Rules API](Built-ins.md)
    - [Managing npm dependencies](dependencies.md)
    - [Providers](Providers.md)
    - [Debugging](debugging.md)
    - [Stamping release builds](stamping.md)
    - [Patching build_bazel_rules_nodejs](changing-rules.md)

3. Custom rules that are distributed under the `@bazel` scope on [npm](http://npmjs.com/~bazel).
    **There are currently no maintainers of these npm packages, so they are effectively deprecated.**
    See the notes in the repository's main README.md.
    This is required when rules have JavaScript code which wants to `require` from peerDependency packages,
    since the node resolution algorithm requires the callsite of `require` to be in the node_modules tree.
    
    - [Labs](Labs.md)
    - [TypeScript](TypeScript.md)

There are also numerous [examples](examples.md)

If you would like to write a rule outside the scope of the projects we recommend hosting them in your GitHub account or the one of your organization.

## Design

Our goal is to make Bazel be a minimal layering on top of existing npm tooling, and to have maximal compatibility with those tools.

This means you won't find a "Webpack vs. Rollup" debate here. You can run whatever tools you like under Bazel. In fact, we recommend running the same tools you're currently using, so that your Bazel migration only changes one thing at a time.

In many cases, there are trade-offs. We try not to make these decisions for you, so instead of paving one "best" way to do things like many JS tooling options, we provide multiple ways. This increases complexity in understanding and using these rules, but also avoids choosing a wrong "winner". For example, you could install the dependencies yourself, or have Bazel manage its own copy of the dependencies, or have Bazel symlink to the ones in the project.

The JS ecosystem is also full of false equivalence arguments. The first question we often get is "What's better, Webpack or Bazel?".
This is understandable, since most JS tooling is forced to provide a single turn-key experience with an isolated ecosystem of plugins, and humans love a head-to-head competition.
Instead Bazel just orchestrates calling these tools.

## Next steps

Look through the `/examples` directory in this repo for many examples of running tools under Bazel.

You might want to look through the API docs for custom rules such as TypeScript, Rollup, and Terser which add support beyond what you get from calling the CLI of those tools.
