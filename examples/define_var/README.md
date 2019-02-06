# Defining environment variables

This example shows how you can set environment variables when running Bazel, then access them inside your program.

1. Use the `--define=some_env=some_value` option to Bazel, as shown here in `package.json`
1. Bazel is hermetic, so if you want `some_env` to be exposed into the environment of an action, it must be declared, using `configuration_env_vars = ["some_env"]` as shown here in `BUILD.bazel`.
1. In your Node.js program, reference `process.env['some_env']` as usual, shown here in `define.spec.js`.
