---
title: Stylus
layout: home
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

<!-- Generated with Stardoc: http://skydoc.bazel.build -->

<a name="#stylus_binary"></a>


## stylus_binary

<pre>
stylus_binary(<a href="#stylus_binary-name">name</a>, <a href="#stylus_binary-compiler">compiler</a>, <a href="#stylus_binary-compress">compress</a>, <a href="#stylus_binary-deps">deps</a>, <a href="#stylus_binary-sourcemap">sourcemap</a>, <a href="#stylus_binary-src">src</a>)
</pre>




### Attributes

<table class="params-table">
  <colgroup>
    <col class="col-param" />
    <col class="col-description" />
  </colgroup>
  <tbody>
    <tr id="stylus_binary-name">
      <td><code>name</code></td>
      <td>
        <a href="https://bazel.build/docs/build-ref.html#name">Name</a>; required
        <p>
          A unique name for this target.
        </p>
      </td>
    </tr>
    <tr id="stylus_binary-compiler">
      <td><code>compiler</code></td>
      <td>
        <a href="https://bazel.build/docs/build-ref.html#labels">Label</a>; optional
        <p>
          Label that points to the stylus binary to run.
            If you install your npm packages to a workspace named something other than "npm",
            you may need to set this to `@my_npm_name//stylus/bin:stylus`
        </p>
      </td>
    </tr>
    <tr id="stylus_binary-compress">
      <td><code>compress</code></td>
      <td>
        Boolean; optional
        <p>
          Compress CSS output
        </p>
      </td>
    </tr>
    <tr id="stylus_binary-deps">
      <td><code>deps</code></td>
      <td>
        <a href="https://bazel.build/docs/build-ref.html#labels">List of labels</a>; optional
        <p>
          Other stylus files that are imported from the src
        </p>
      </td>
    </tr>
    <tr id="stylus_binary-sourcemap">
      <td><code>sourcemap</code></td>
      <td>
        Boolean; optional
        <p>
          Generates a sourcemap in sourcemaps v3 format
        </p>
      </td>
    </tr>
    <tr id="stylus_binary-src">
      <td><code>src</code></td>
      <td>
        <a href="https://bazel.build/docs/build-ref.html#labels">Label</a>; required
        <p>
          A single .styl Stylus file to transform
        </p>
      </td>
    </tr>
  </tbody>
</table>

