---
title: Stylus
layout: default
stylesheet: docs
---
# Stylus rules for Bazel

**WARNING: this is beta-quality software. Breaking changes are likely. Not recommended for production use without expert support.**

The Stylus rules run the Stylus CSS preprocessor with Bazel.

Wraps the Stylus CLI documented at http://stylus-lang.com/docs/executable.html


## Installation

Add the `@bazel/stylus` npm package to your `devDependencies` in `package.json`.

Your `WORKSPACE` should declare a `yarn_install` or `npm_install` rule named `npm`.
It should then install the rules found in the npm packages using the `install_bazel_dependencies` function.
See https://github.com/bazelbuild/rules_nodejs/#quickstart

This causes the `@bazel/stylus` package to be installed as a Bazel workspace named `npm_bazel_stylus`.


## Installing with self-managed dependencies

If you didn't use the `yarn_install` or `npm_install` rule to create an `npm` workspace, you'll have to declare a rule in your root `BUILD.bazel` file to execute stylus:

```python
# Create a stylus rule to use in stylus_binary#compiler
# attribute when using self-managed dependencies
nodejs_binary(
    name = "stylus_bin",
    entry_point = "//:node_modules/stylus/bin/stylus",
    # Point bazel to your node_modules to find the entry point
    node_modules = ["//:node_modules"],
)
```

[name]: https://bazel.build/docs/build-ref.html#name
[label]: https://bazel.build/docs/build-ref.html#labels
[labels]: https://bazel.build/docs/build-ref.html#labels


## stylus_binary

Run the Stylus CLI tool to transform `foo.styl` into `foo.css`


### Usage

```
stylus_binary(name, compiler, compress, deps, sourcemap, src)
```



#### `name`
(*[name], mandatory*): A unique name for this target.


#### `compiler`
(*[label]*): Label that points to the stylus binary to run.
            If you install your npm packages to a workspace named something other than "npm",
            you may need to set this to `@my_npm_name//stylus/bin:stylus`


#### `compress`
(*Boolean*): Compress CSS output


#### `deps`
(*[labels]*): Other stylus files that are imported from the src


#### `sourcemap`
(*Boolean*): Generates a sourcemap in sourcemaps v3 format


#### `src`
(*[label], mandatory*): A single .styl Stylus file to transform


