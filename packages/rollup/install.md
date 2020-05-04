# rollup rules for Bazel

The rollup rules run the rollup JS bundler with Bazel.

Wraps the rollup CLI documented at https://rollupjs.org/guide/en/#command-line-reference

## Installation

Add the `@bazel/rollup` npm package to your `devDependencies` in `package.json`.

## Installing with self-managed dependencies

If you didn't use the `yarn_install` or `npm_install` rule, you'll have to declare a rule in your root `BUILD.bazel` file to execute rollup:

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

