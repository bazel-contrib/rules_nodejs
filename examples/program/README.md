# Program example

This example shows how to write a simple Node.js program, with tests.

In this example, we do the opposite of the `examples/bazel_managed_deps`. Instead, the dependencies
are managed explicitly by the user. While we typically prefer to have Bazel manage dependencies, this
option could be useful if you vendor the depnedencies into your repository, or use a custom package
manager that's not integrated with Bazel.

`index.js` is the trivial program. You can run it like:

```sh
$ bazel run :example 1
Running program
increment 1 is 2
```

`index.spec.js` is a test. Run it with:

```sh
$ bazel test :test

//:test                                                                  PASSED in 0.2s

Executed 1 out of 1 test: 1 test passes.
```
