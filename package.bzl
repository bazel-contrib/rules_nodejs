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
VERSION = "0.12.0"

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

def rules_nodejs_dev_dependencies():
    """
    Fetch dependencies needed for local development, but not needed by users.

    These are in this file to keep version information in one place, and make the WORKSPACE
    shorter.
    """
    # Needed for Remote Build Execution
    http_archive(
        name = "bazel_toolchains",
        urls = [
            "https://mirror.bazel.build/github.com/bazelbuild/bazel-toolchains/archive/cdea5b8675914d0a354d89f108de5d28e54e0edc.tar.gz",
            "https://github.com/bazelbuild/bazel-toolchains/archive/cdea5b8675914d0a354d89f108de5d28e54e0edc.tar.gz",
        ],
        strip_prefix = "bazel-toolchains-cdea5b8675914d0a354d89f108de5d28e54e0edc",
        sha256 = "cefb6ccf86ca592baaa029bcef04148593c0efe8f734542f10293ea58f170715",
    )

    # This commit matches the version of buildifier in angular/ngcontainer
    # If you change this, also check if it matches the version in the angular/ngcontainer
    # version in /.circleci/config.yml
    BAZEL_BUILDTOOLS_VERSION = "82b21607e00913b16fe1c51bec80232d9d6de31c"

    http_archive(
        name = "com_github_bazelbuild_buildtools",
        url = "https://github.com/bazelbuild/buildtools/archive/%s.zip" % BAZEL_BUILDTOOLS_VERSION,
        strip_prefix = "buildtools-%s" % BAZEL_BUILDTOOLS_VERSION,
        sha256 = "edb24c2f9c55b10a820ec74db0564415c0cf553fa55e9fc709a6332fb6685eff",
    )

    http_archive(
        name = "io_bazel_rules_sass",
        url = "https://github.com/bazelbuild/rules_sass/archive/1.11.0.zip",
        strip_prefix = "rules_sass-1.11.0",
        sha256 = "dbe9fb97d5a7833b2a733eebc78c9c1e3880f676ac8af16e58ccf2139cbcad03",
    )

    http_archive(
        name = "io_bazel_skydoc",
        url = "https://github.com/bazelbuild/skydoc/archive/0ef7695c9d70084946a3e99b89ad5a99ede79580.zip",
        strip_prefix = "skydoc-0ef7695c9d70084946a3e99b89ad5a99ede79580",
        sha256 = "491f9e142b870b18a0ec8eb3d66636eeceabe5f0c73025706c86f91a1a2acb4d",
    )

def _maybe(repo_rule, name, **kwargs):
    if name not in native.existing_rules():
        repo_rule(name = name, **kwargs)
