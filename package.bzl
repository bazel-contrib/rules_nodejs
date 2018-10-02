# Copyright 2018 The Bazel Authors. All rights reserved.
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#    http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

"""Dependency-related rules defining our version and dependency versions.

Fulfills similar role as the package.json file.
"""

load("//internal/common:check_version.bzl", "check_version")
load("@bazel_tools//tools/build_defs/repo:http.bzl", "http_archive")

# This version is synced with the version in package.json.
# It will be automatically synced via the npm "version" script
# that is run when running `npm version` during the release
# process. See `Releasing` section in README.md.
VERSION = "0.14.2"

def check_rules_nodejs_version(minimum_version_string):
  """
  Verify that a minimum build_bazel_rules_nodejs is loaded a WORKSPACE.

  This should be called from the `WORKSPACE` file so that the build fails as
  early as possible. For example:

  ```
  # in WORKSPACE:
  load("@build_bazel_rules_nodejs//:package.bzl", "check_rules_nodejs_version")
  check_rules_nodejs_version("0.11.2")
  ```

  Args:
    minimum_version_string: a string indicating the minimum version
  """
  if not check_version(VERSION, minimum_version_string):
    fail("\nCurrent build_bazel_rules_nodejs version is {}, expected at least {}\n".format(
        VERSION, minimum_version_string))

def rules_nodejs_dependencies():
    """
    Fetch our transitive dependencies.

    If the user wants to get a different version of these, they can just fetch it
    from their WORKSPACE before calling this function, or not call this function at all.
    """
    _maybe(
        http_archive,
        name = "bazel_skylib",
        url = "https://github.com/bazelbuild/bazel-skylib/archive/0.3.1.zip",
        strip_prefix = "bazel-skylib-0.3.1",
        sha256 = "95518adafc9a2b656667bbf517a952e54ce7f350779d0dd95133db4eb5c27fb1",
    )

    # Needed for Remote Build Execution
    # See https://releases.bazel.build/bazel-toolchains.html
    # Not strictly a dependency for all users, but it is convenient for them to have this repository
    # defined to reduce the effort required to on-board to remote execution.
    http_archive(
        name = "bazel_toolchains",
        urls = [
            "https://mirror.bazel.build/github.com/bazelbuild/bazel-toolchains/archive/cdea5b8675914d0a354d89f108de5d28e54e0edc.tar.gz",
            "https://github.com/bazelbuild/bazel-toolchains/archive/cdea5b8675914d0a354d89f108de5d28e54e0edc.tar.gz",
        ],
        strip_prefix = "bazel-toolchains-cdea5b8675914d0a354d89f108de5d28e54e0edc",
        sha256 = "cefb6ccf86ca592baaa029bcef04148593c0efe8f734542f10293ea58f170715",
    )

def rules_nodejs_dev_dependencies():
    """
    Fetch dependencies needed for local development, but not needed by users.

    These are in this file to keep version information in one place, and make the WORKSPACE
    shorter.
    """

    http_archive(
        name = "com_github_bazelbuild_buildtools",
        url = "https://github.com/bazelbuild/buildtools/archive/0.15.0.zip",
        strip_prefix = "buildtools-0.15.0",
        sha256 = "76d1837a86fa6ef5b4a07438f8489f00bfa1b841e5643b618e01232ba884b1fe",
    )

    http_archive(
        name = "io_bazel_rules_sass",
        url = "https://github.com/bazelbuild/rules_sass/archive/1.11.0.zip",
        strip_prefix = "rules_sass-1.11.0",
        sha256 = "dbe9fb97d5a7833b2a733eebc78c9c1e3880f676ac8af16e58ccf2139cbcad03",
    )

    http_archive(
        name = "io_bazel_skydoc",
        url = "https://github.com/bazelbuild/skydoc/archive/8632e30e7b1fa2d58f73ea0ef1f043b4b35794f5.zip",
        strip_prefix = "skydoc-8632e30e7b1fa2d58f73ea0ef1f043b4b35794f5",
        sha256 = "d8b663c41039dfd84f3ad26d04f9df3122af090f73816b3ffb8c0df660e1fc74",
    )

    # Go is a transitive dependency of buildifier
    http_archive(
        name = "io_bazel_rules_go",
        urls = ["https://github.com/bazelbuild/rules_go/releases/download/0.13.0/rules_go-0.13.0.tar.gz"],
        sha256 = "ba79c532ac400cefd1859cbc8a9829346aa69e3b99482cd5a54432092cbc3933",
    )

    # Fetching the Bazel source code allows us to compile the Skylark linter
    http_archive(
        name = "io_bazel",
        url = "https://github.com/bazelbuild/bazel/archive/0.17.2.zip",
        strip_prefix = "bazel-0.17.2",
        sha256 = "a6d7ae3939e7bb2e410949adab8aa2759eda0b017bf5fc18658dc635552ce56e",
    )

def _maybe(repo_rule, name, **kwargs):
    if name not in native.existing_rules():
        repo_rule(name = name, **kwargs)
