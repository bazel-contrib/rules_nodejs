# Parcel example

This example shows how to write a simple Bazel rule which wraps a binary from npm.

We chose Parcel because it's a build tool not yet supported in our own Bazel rules.

We start from the [Parcel Getting Started](https://parceljs.org/getting_started.html).

Parcel can do many jobs which overlap with Bazel, such as development serving and watching.

Parcel can do file-system watching, but this overlaps with [ibazel](https://github.com/bazelbuild/bazel-watcher) so this mode is probably undesirable under Bazel.

Also, Parcel has a development server.
It would need to be hosted properly to see generated Bazel outputs from other build steps.
See https://github.com/angular/angular-bazel-example/wiki/Running-a-devserver-under-Bazel

In this example we'll only use Parcel for production bundling, as documented at https://parceljs.org/production.html

## 1. Installing and running Parcel

The `package.json` file lists a `devDependency` on `parcel-bundler`.

Next, in `WORKSPACE` we run the `yarn_install` rule.
This fetches the packages into the Bazel output_base folder, here: `$(bazel info output_base)/external/npm`.
It also generates Bazel configuration files.
Since `parcel-bundler/package.json` declares a `bin: {"parcel"}` key, Bazel will generate a corresponding target.

```sh
$ bazel query --output=label_kind @npm//parcel-bundler/bin:*
alias rule @npm//parcel-bundler/bin:parcel
source file @npm//parcel-bundler/bin:BUILD.bazel
```

So with no other code, we can already run Parcel itself.

```sh
$ bazel run @npm//parcel-bundler/bin:parcel
Server running at http://localhost:1234 
🚨  No entries found.
    at Bundler.bundle (execroot/examples_parcel/bazel-out/k8-fastbuild/bin/external/npm/node_modules/parcel-bundler/parcel__bin.runfiles/npm/node_modules/parcel-bundler/src/Bundler.js:261:17)
```

## 2. Wrapping parcel in a rule (plugin)

Bazel's idiomatic naming scheme for rules is [name of tool]_[type of rule] where types of rules include "library", "binary", "test", "package", "bundle", etc.
Since Parcel is a bundler, we'll name our rule `parcel_bundle`.
The rule describes the inputs, not what to do with them.

In `BUILD.bazel` we show an example usage of the new rule.

In `parcel.bzl` you can see how the rule is implemented. It returns two outputs: the bundle file and a sourcemap.

To try the rule, run

```sh
$ bazel build :bundle
INFO: From Running Parcel to produce bazel-out/k8-fastbuild/bin/bundle.js:
✨  Built in 499ms.

bazel-out/k8-fastbuild/bin/bundle.js     1.3 KB    191ms
bazel-out/k8-fastbuild/bin/bundle.map     399 B      2ms
Target //:bundle up-to-date:
  bazel-bin/bundle.js
  bazel-bin/bundle.map
```

## 3. Testing the rule

Currently, we just demonstrate how to test it end-to-end by bundling `foo.js` and `bar.js` into a UMD bundle.
Then in `parcel.spec.js` we `require()` that bundle in Node.js and assert that it had the right side-effect.
(It prints `Hello, Bob`)

You can run the test:

```sh
$ bazel test :all
//:test (cached) PASSED in 0.3s

Executed 0 out of 1 test: 1 test passes.
```
