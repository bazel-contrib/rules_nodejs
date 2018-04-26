# Bazel-managed deps

The NodeJS rules allow you to skip the install step, and have Bazel run yarn/npm for you.

See the /WORKSPACE file where we declare a workspace called
build_bazel_rules_typescript_internal_bazel_managed_deps
that will be installed automatically by Bazel.

We then can build the code in this directory without installing the package.json located here.

Regression test for
https://github.com/bazelbuild/rules_typescript/issues/179
