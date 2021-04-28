# Copyright 2019 The Bazel Authors. All rights reserved.
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#    http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

# This contains references to the symbols we want documented.
# We can't point stardoc to the top-level index.bzl since then it will see macros rather than the rules they wrap.
# So this is a copy of index.bzl with macro indirection removed.
"""
# @bazel/concatjs

Concatjs is a JavaScript bundler, in a trivial sense: the UNIX `cat` command is a basic implementation:

```bash
$ cat one.js two.js > bundle.js
```

Clearly self-evident is that this bundler is super-fast and simple.
A performant implementation adds some in-memory caching, and for developer ergonomics you add a simple IIFE wrapper
around each file so that the Chrome DevTools shows the files in the tree as if they had been independently loaded.

However at its core, concatjs requires a big tradeoff of a migration cost to buy-in, to get this incredible performance.
The path of the JavaScript files is lost in the bundling process, so they must contain their module ID internally.

[Named AMD/UMD modules](https://requirejs.org/docs/whyamd.html#namedmodules) and `goog.module` are the two JS module formats that are compatible with concatjs.
Most packages do not ship with this format, so in order to use concatjs tooling, you have to shim your code and dependencies. See the [Compatibility](#compatibility) section below.

This is at the core of how Google does JavaScript development.
So Bazel rules that originated in Google's codebase have affordances for concatjs.
For example `ts_library` produces named AMD modules in its "devmode" output, and
`karma_web_test` expects to bundle inputs using concatjs.

## Compatibility

### First-party code

First-party code has to be authored as named AMD/UMD modules.
This is also historically referred to as "RequireJS" modules since that's the
JS loader that is typically used with them.

If you write TypeScript, you can do this following their [documentation](https://www.typescriptlang.org/docs/handbook/modules.html).

There is an example in this repository: we have an `index.ts` file that wants
to be used with require.js `require("@bazel/concatjs")`.
So it
[declares
that module name](https://github.com/bazelbuild/rules_nodejs/blob/bd53eb524ea3bd56b46b7a5f2eff700443e281ec/packages/concatjs/index.ts#L1)
using the TS triple-slash syntax:

```typescript
///<amd-module name="@bazel/concatjs"/>
```

it is [also compiled with](https://github.com/bazelbuild/rules_nodejs/blob/bd53eb524ea3bd56b46b7a5f2eff700443e281ec/packages/concatjs/BUILD.bazel#L28)
the `"compilerOptions": { "module": "umd" }` TypeScript setting.

### Third-party code

To make it easier to produce a UMD version of a third-party npm package, we automatically generate a target that uses Browserify to build one, using the `main` entry from the package's `package.json`.
In most cases this will make the package loadable under concatjs.
This target has a `__umd` suffix. For example, if your library is at `@npm//foo` then the UMD target is `@npm//foo:foo__umd`.

An example where this fixes a users issue: <https://github.com/bazelbuild/rules_nodejs/issues/2317#issuecomment-735921318>

In some cases, the generated UMD bundle is not sufficient, and in others it fails to build because it requires some special Browserify configuration.
You can always write your own shim that grabs a symbol from a package you use, and exposes it in an AMD/require.js-compatible way.
For example, even though RxJS ships with a UMD bundle, it contains multiple entry points and uses anonymous modules, not named modules. So our Angular/concatjs example has a `rxjs_shims.js` file that exposes some RxJS operators, then at <https://github.com/bazelbuild/rules_nodejs/blob/2.3.1/examples/angular/src/BUILD.bazel#L65-L71> this is combined in a `filegroup` with the `rxjs.umd.js` file. Now we use this filegroup target when depending on RxJS in a `concatjs_*` rule.

Ultimately by using concatjs, you're signing up for at least a superficial understanding of these shims and may need to update them when you change your dependencies.

## Serving JS in development mode under Bazel

There are two choices for development mode:

1. Use the `concatjs_devserver` rule to bring up our simple, fast development server.
   This is intentionally very simple, to help you get started quickly. However,
   since there are many development servers available, we do not want to mirror
   their features in yet another server we maintain.
2. Teach your real frontend server to serve files from Bazel's output directory.
   This is not yet documented. Choose this option if you have an existing server
   used in development mode, or if your requirements exceed what the
   `concatjs_devserver` supports. Be careful that your development round-trip stays
   fast (should be under two seconds).

To use `concatjs_devserver`, you simply `load` the rule, and call it with `deps` that
point to your `ts_library` target(s):

```python
load("//packages/concatjs:index.bzl", "concatjs_devserver")
load("//packages/typescript:index.bzl", "ts_library")

ts_library(
    name = "app",
    srcs = ["app.ts"],
)

concatjs_devserver(
    name = "devserver",
    # We'll collect all the devmode JS sources from these TypeScript libraries
    deps = [":app"],
    # This is the path we'll request from the browser, see index.html
    serving_path = "/bundle.js",
    # The devserver can serve our static files too
    static_files = ["index.html"],
)
```

The `index.html` should be the same one you use for production, and it should
load the JavaScript bundle from the path indicated in `serving_path`.

If you don't have an index.html file, a simple one will be generated by the
`concatjs_devserver`.

See `examples/app` in this repository for a working example. To run the
devserver, we recommend you use [ibazel]:

```sh
$ ibazel run examples/app:devserver
```

`ibazel` will keep the devserver program running, and provides a LiveReload
server so the browser refreshes the application automatically when each build
finishes.

[ibazel]: https://github.com/bazelbuild/bazel-watcher

## Testing with Karma

The `karma_web_test` rule runs karma tests with Bazel.

It depends on rules_webtesting, so you need to add this to your `WORKSPACE`
if you use the web testing rules in `@bazel/concatjs`:

```python
# Fetch transitive Bazel dependencies of karma_web_test
http_archive(
    name = "io_bazel_rules_webtesting",
    sha256 = "9bb461d5ef08e850025480bab185fd269242d4e533bca75bfb748001ceb343c3",
    urls = ["https://github.com/bazelbuild/rules_webtesting/releases/download/0.3.3/rules_webtesting.tar.gz"],
)

# Set up web testing, choose browsers we can test on
load("@io_bazel_rules_webtesting//web:repositories.bzl", "web_test_repositories")

web_test_repositories()

load("@io_bazel_rules_webtesting//web/versioned:browsers-0.3.2.bzl", "browser_repositories")

browser_repositories(
    chromium = True,
    firefox = True,
)
```

## Installing with user-managed dependencies

If you didn't use the `yarn_install` or `npm_install` rule to create an `npm` workspace, you'll have to declare a rule in your root `BUILD.bazel` file to execute karma:

```python
# Create a karma rule to use in karma_web_test_suite karma
# attribute when using user-managed dependencies
nodejs_binary(
    name = "karma/karma",
    entry_point = "//:node_modules/karma/bin/karma",
    # Point bazel to your node_modules to find the entry point
    data = ["//:node_modules"],
)
```
"""

load("//packages/concatjs/devserver:concatjs_devserver.bzl", _concatjs_devserver = "concatjs_devserver")
load(
    "//packages/concatjs/web_test:karma_web_test.bzl",
    _karma_web_test = "karma_web_test",
    _karma_web_test_suite = "karma_web_test_suite",
)

karma_web_test = _karma_web_test
karma_web_test_suite = _karma_web_test_suite
concatjs_devserver = _concatjs_devserver
# DO NOT ADD MORE rules here unless they appear in the generated docsite.
# Run yarn stardoc to re-generate the docsite.
