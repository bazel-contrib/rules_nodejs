---
title: Home
layout: default
toc: true
---

# Bazel JavaScript rules

Bazel is Google's build system.
It powers our development at large scale by caching intermediate build artifacts,
allowing build and test to be incremental and massively parallelizable.
Read more at [https://bazel.build](https://bazel.build)

This JavaScript support lets you build and test code that targets a JavaScript runtime, including NodeJS and browsers.


## Scope of the project

This repository contains an orthogonal set of rules which covers an opinionated toolchain for JavaScript development. If you would like to request a new rule, please open a [feature request](https://github.com/bazelbuild/rules_nodejs/issues/new), describe your use case, why it's important, and why you can't do it within the existing rules. Then the maintainers can decide if it is within the scope of the project and will have a large enough impact to warrant the time required to implement.  

If you would like to write a rule outside the scope of the projects we recommend hosting them in your GitHub account or the one of your organization.

## Design

Most bazel rules include package management. That is, the `WORKSPACE` file installs both your dependencies and toolchain at the same time. For example, in Java, Gradle and Maven they each install both a build tool and a packagae at the same time. 

In nodejs, there are a variety of package managers and build tools which can interoperate. Also, there is a well-known package installation location (`node_modules` directory in your project). Command-line and other tools look in this directory to find packages. So we must either download packages twice (risking version skew between them) or point all tools to Bazel's `external` directory with `NODE_PATH` which would be very inconvenient.

Instead, our philosophy is: in the NodeJS ecosystem, Bazel is only a build tool. It is up to the user to install packages into their `node_modules` directory, though the build tool can verify the contents.

## Hermeticity and reproducibility

Bazel generally guarantees builds are correct with respect to their inputs. For example, this means that given the same source tree, you can re-build the same artifacts as an earlier release of your program. In the nodejs rules, Bazel is not the package manager, so some responsibility falls to the developer to avoid builds that use the wrong dependencies. This problem exists with any build system in the JavaScript ecosystem.

Both NPM and Yarn have a lockfile, which ensures that dependencies only change when the lockfile changes. Users are *strongly encouraged* to use the locking mechanism in their package manager.

References:

- npm: <https://docs.npmjs.com/files/package-lock.json>
- yarn: <https://yarnpkg.com/lang/en/docs/yarn-lock/>

Note that <https://github.com/bazelbuild/rules_nodejs/issues/1> will take the guarantee further: by using the lockfile as an input to Bazel, the nodejs rules can verify the integrity of the dependencies. This would make it impossible for a build to be non-reproducible, so long as you have the same lockfile.


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
