# Karma rules for Bazel

**WARNING: this is beta-quality software. Breaking changes are likely. Not recommended for production use without expert support.**

The Karma rules run karma tests with Bazel.

## Installation

Add the `@bazel/karma` npm package to your `devDependencies` in `package.json`.

Your `WORKSPACE` should declare a `yarn_install` or `npm_install` rule named `npm`.
It should then install the rules found in the npm packages.

This is copied from the README for rules_nodejs:

```python
load("@bazel_tools//tools/build_defs/repo:http.bzl", "http_archive")

# Fetch rules_nodejs
# (you can check https://github.com/bazelbuild/rules_nodejs/releases for a newer release than this)
http_archive(
    name = "build_bazel_rules_nodejs",
    urls = ["https://github.com/bazelbuild/rules_nodejs/releases/download/0.18.5/rules_nodejs-0.18.5.tar.gz"],
    sha256 = "c8cd6a77433f7d3bb1f4ac87f15822aa102989f8e9eb1907ca0cad718573985b",
)

# Setup the NodeJS toolchain
load("@build_bazel_rules_nodejs//:defs.bzl", "node_repositories", "yarn_install")
node_repositories()

yarn_install(
  name = "npm",
  package_json = "//:package.json",
  yarn_lock = "//:yarn.lock",
)

# Install all Bazel dependencies needed for npm packages that supply Bazel rules
load("@npm//:install_bazel_dependencies.bzl", "install_bazel_dependencies")
install_bazel_dependencies()
```

This causes the `@bazel/karma` package to be installed as a Bazel workspace named `npm_bazel_karma`.

Now add this to your `WORKSPACE` to install the Karma dependencies:

```python
# Fetch transitive Bazel dependencies of npm_bazel_karma
load("@npm_bazel_karma//:package.bzl", "rules_karma_dependencies")
rules_karma_dependencies()
```

This installs the `io_bazel_rules_webtesting` repository, if you haven't installed it earlier.

Finally, configure the rules_webtesting:

```python
# Setup web testing, choose browsers we can test on
load("@io_bazel_rules_webtesting//web:repositories.bzl", "browser_repositories", "web_test_repositories")

web_test_repositories()
browser_repositories(
    chromium = True,
)
```

## Installing with self-managed dependencies

If you didn't use the `yarn_install` or `npm_install` rule to create an `npm` workspace, you'll have to declare a rule in your root `BUILD.bazel` file to execute karma:

```python
# Create a karma rule to use in ts_web_test_suite karma
# attribute when using self-managed dependencies
nodejs_binary(
    name = "karma/karma",
    entry_point = "karma/bin/karma",
    # Point bazel to your node_modules to find the entry point
    node_modules = ["//:node_modules"],
)
```

