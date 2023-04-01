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
    - [Rollup](Rollup.md)
    - [Terser](Terser.md)
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

## Quickstart

First we create a new workspace, which will be in a new directory.
We can use the `@bazel/create` npm package to do this in one command.
This is the fastest way to get started for most use cases.

> See [the installation page](install.html) for details and alternative methods.

```sh
$ npm init @bazel my_workspace
$ cd my_workspace
```

> You could do the same thing with yarn:
> ```sh
> $ yarn create @bazel my_workspace
> $ cd my_workspace
> ```
> Both of these commands are equivalent to `npx @bazel/create` which downloads the latest version of the `@bazel/create` package from npm and runs the program it contains.
> Run the tool with no arguments for command-line options and next steps.

Next we install some development tools.
For this example, we'll use Babel to transpile our JavaScript, Mocha for running tests, and http-server to serve our app.
These are arbitrary choices, you may use whatever are your favorites.  

```sh
$ npm install @babel/core @babel/cli @babel/preset-env http-server mocha domino
```

Let's run these tools with Bazel. There are two ways to run tools:

- Use an auto-generated Bazel rule by importing from an `index.bzl` file in the npm package
- Use a custom rule in rules_nodejs or write one yourself

In this example we use the auto-generated rules.
First we need to import them, using a load statement.
So edit `BUILD.bazel` and add:

```python
load("@npm//@babel/cli:index.bzl", "babel")
load("@npm//mocha:index.bzl", "mocha_test")
load("@npm//http-server:index.bzl", "http_server")
```

> This shows us that rules_nodejs has told Bazel that a workspace named @npm is available
> (think of the at-sign like a scoped package for Bazel).
> rules_nodejs will add `index.bzl` files exposing all the binaries the package manager installed
> (the same as the content of the `node_modules/.bin folder`).
> The three tools we installed are in this @npm scope and each has an index file with a .bzl extension.

Next we teach Bazel how to transform our JavaScript inputs into transpiled outputs.
Here we assume that you have `app.js` and `es5.babelrc` in your project. See [our example webapp](https://github.com/bazelbuild/rules_nodejs/tree/1.4.0/examples/webapp) for an example of what those files might look like.
Now we want Babel to produce `app.es5.js` so we add to `BUILD.bazel`:

```python
babel(
    name = "compile",
    data = [
        "app.js",
        "es5.babelrc",
        "@npm//@babel/preset-env",
    ],
    outs = ["app.es5.js"],
    args = [
        "app.js",
        "--config-file",
        "./$(execpath es5.babelrc)",
        "--out-file",
        "$(execpath app.es5.js)",
    ],
)
```

> This just calls the Babel CLI, so you can see [their documentation](https://babeljs.io/docs/en/babel-cli) for what arguments to pass.
> We use the $(execpath) helper in Bazel so we don't need to hardcode paths to the inputs or outputs.

We can now build the application: `npm run build`

and we see the .js outputs from babel appear in the `dist/bin` folder.

Let's serve the app to see how it looks, by adding to `BUILD.bazel`:

```
http_server(
    name = "server",
    data = [
        "index.html",
        "app.es5.js",
    ],
    args = ["."],
)
```

Add a `serve` entry to the scripts in `package.json`:

```json
{
  "scripts": {
    "serve": "ibazel run :server"
  }
}
```

> ibazel is the watch mode for bazel.
>
> Note that on Windows, you need to pass `--enable_runfiles` flag to Bazel.
> That's because Bazel creates a directory where inputs and outputs both conveniently appear together.

Now we can serve the app: `npm run serve`

Finally we'll add a test using Mocha, and the domino package so we don't need a browser. Add to `BUILD.bazel`:

```python
mocha_test(
    name = "unit_tests",
    args = ["*.spec.js"],
    data = glob(["*.spec.js"]) + [
        "@npm//domino",
        "app.es5.js",
    ],
)
```

Run the tests: `npm test`

## Next steps

Look through the `/examples` directory in this repo for many examples of running tools under Bazel.

You might want to look through the API docs for custom rules such as TypeScript, Rollup, and Terser which add support beyond what you get from calling the CLI of those tools.
