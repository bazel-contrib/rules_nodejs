---
title: Jasmine
layout: default
stylesheet: docs
---
# Jasmine rules for Bazel

**WARNING: this is beta-quality software. Breaking changes are likely. Not recommended for production use without expert support.**

The Jasmine rules run tests under the Jasmine framework with Bazel.


## Installation

Add the `@bazel/jasmine` npm package to your `devDependencies` in `package.json`.

Your `WORKSPACE` should declare a `yarn_install` or `npm_install` rule named `npm`.
It should then install the rules found in the npm packages using the `install_bazel_dependencies` function.

This causes the `@bazel/jasmine` package to be installed as a Bazel workspace named `npm_bazel_jasmine`.

[name]: https://bazel.build/docs/build-ref.html#name
[label]: https://bazel.build/docs/build-ref.html#labels
[labels]: https://bazel.build/docs/build-ref.html#labels


## jasmine_node_test

Runs tests in NodeJS using the Jasmine test runner.

To debug the test, see debugging notes in `nodejs_test`.



### Usage

```
jasmine_node_test(name, srcs, data, deps, expected_exit_code, tags, coverage, jasmine, jasmine_entry_point, kwargs)
```



#### `name`
      

Name of the resulting label      


#### `srcs`
      
 default is <code>[]</code>
JavaScript source files containing Jasmine specs      


#### `data`
      
 default is <code>[]</code>
Runtime dependencies which will be loaded while the test executes      


#### `deps`
      
 default is <code>[]</code>
Other targets which produce JavaScript, such as ts_library      


#### `expected_exit_code`
      
 default is <code>0</code>
The expected exit code for the test. Defaults to 0.      


#### `tags`
      
 default is <code>[]</code>
Bazel tags applied to test      


#### `coverage`
      
 default is <code>False</code>
Enables code coverage collection and reporting. Defaults to False.      


#### `jasmine`
      
 default is <code>"@npm//@bazel/jasmine"</code>
A label providing the `@bazel/jasmine` npm dependency.      


#### `jasmine_entry_point`
      
 default is <code>"@npm//:node_modules/@bazel/jasmine/jasmine_runner.js"</code>
A label providing the `@bazel/jasmine` entry point.      


#### `kwargs`
      

Remaining arguments are passed to the test rule      



