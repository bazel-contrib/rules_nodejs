# rollup rules for Bazel

**WARNING: this is beta-quality software. Breaking changes are likely. Not recommended for production use without expert support.**

The rollup rules run the rollup JS bundler with Bazel.

Wraps the rollup CLI documented at https://rollupjs.org/guide/en/#command-line-reference

## Installation

Add the `@bazel/rollup` npm package to your `devDependencies` in `package.json`.

Your `WORKSPACE` should declare a `yarn_install` or `npm_install` rule named `npm`.
It should then install the rules found in the npm packages using the `install_bazel_dependencies` function.
See https://github.com/bazelbuild/rules_nodejs/#quickstart

This causes the `@bazel/rollup` package to be installed as a Bazel workspace named `npm_bazel_rollup`.

## Installing with self-managed dependencies

If you didn't use the `yarn_install` or `npm_install` rule to create an `npm` workspace, you'll have to declare a rule in your root `BUILD.bazel` file to execute rollup:

```python
# Create a rollup rule to use in rollup_bundle#rollup_bin
# attribute when using self-managed dependencies
nodejs_binary(
    name = "rollup_bin",
    entry_point = "//:node_modules/rollup/bin/rollup",
    # Point bazel to your node_modules to find the entry point
    node_modules = ["//:node_modules"],
)
```

