# Terser rules for Bazel

The Terser rules run the Terser JS minifier with Bazel.

Wraps the Terser CLI documented at https://github.com/terser-js/terser#command-line-usage

## Installation

Add the `@bazel/terser` npm package to your `devDependencies` in `package.json`.

## Installing with user-managed dependencies

If you didn't use the `yarn_install` or `npm_install` rule, you'll have to declare a rule in your root `BUILD.bazel` file to execute terser:

```python
# Create a terser rule to use in terser_minified#terser_bin
# attribute when using user-managed dependencies
nodejs_binary(
    name = "terser_bin",
    entry_point = "//:node_modules/terser/bin/uglifyjs",
    # Point bazel to your node_modules to find the entry point
    data = ["//:node_modules"],
)
```

