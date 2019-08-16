# Less rules for Bazel

**WARNING: this is beta-quality software. Breaking changes are likely. Not recommended for production use without expert support.**

The Less rules run the Less CSS preprocessor with Bazel.

## Installation

Add the `@bazel/less` npm package to your `devDependencies` in `package.json`.

Your `WORKSPACE` should declare a `yarn_install` or `npm_install` rule named `npm`.
It should then install the rules found in the npm packages using the `install_bazel_dependencies` function.
See https://github.com/bazelbuild/rules_nodejs/#quickstart

This causes the `@bazel/less` package to be installed as a Bazel workspace named `npm_bazel_less`.

## Installing with self-managed dependencies

If you didn't use the `yarn_install` or `npm_install` rule to create an `npm` workspace, you'll have to declare a rule in your root `BUILD.bazel` file to execute less:

```python
# Create a less rule to use in less_binary#compiler
# attribute when using self-managed dependencies
nodejs_binary(
    name = "less_bin",
    entry_point = "//:node_modules/less/bin/lessc",
    # Point bazel to your node_modules to find the entry point
    node_modules = ["//:node_modules"],
)
```

