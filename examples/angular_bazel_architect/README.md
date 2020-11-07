# Angular Bazel Architect

There are a few ways to use Angular with Bazel. See https://bazelbuild.github.io/rules_nodejs/examples#angular for an overview of all the options.

This example showcases building and testing a project with the Angular CLI.
Instead of using the Angular CLI directly we use Architect here, which is the lower level api for the Angular CLI.

This requires one patch, which can be found under [./patches](./patches).
This patch adjusts how the architect-cli prints stdio so that when running under Bazel you don't lose your logs.
