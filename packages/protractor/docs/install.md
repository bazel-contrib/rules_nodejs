# Protractor rules for Bazel

The Protractor rules run tests under the Protractor framework with Bazel.

## Installation

Add the `@bazel/protractor` npm package to your `devDependencies` in `package.json`.

Your `WORKSPACE` should declare a `yarn_install` or `npm_install` rule named `npm`.
It should then install the rules found in the npm packages using the `install_bazel_dependencies' function.
See https://github.com/bazelbuild/rules_nodejs/#quickstart

This causes the `@bazel/protractor` package to be installed as a Bazel workspace named `npm_bazel_protractor`.

