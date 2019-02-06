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

load("@bazel_tools//tools/build_defs/repo:http.bzl", "http_archive")
load("//internal/common:check_version.bzl", "check_version")

# This version is synced with the version in package.json.
# It will be automatically synced via the npm "version" script
# that is run when running `npm version` during the release
# process. See `Releasing` section in README.md.
VERSION = "0.17.0"

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
            VERSION,
            minimum_version_string,
        ))

def rules_nodejs_dependencies():
    print("""DEPRECATION WARNING:
    rules_nodejs_dependencies is no longer needed, and will be removed in a future release.
    Simply remove any calls to this function and the corresponding call to
      load("@build_bazel_rules_nodejs//:package.bzl", "rules_nodejs_dependencies")
    """)

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
        url = "https://github.com/bazelbuild/rules_sass/archive/8ccf4f1c351928b55d5dddf3672e3667f6978d60.zip",  # 2018-11-23
        strip_prefix = "rules_sass-8ccf4f1c351928b55d5dddf3672e3667f6978d60",
        sha256 = "894d7928df8da85e263d743c8434d4c10ab0a3f0708fed0d53394e688e3faf70",
    )

    http_archive(
        name = "io_bazel_skydoc",
        url = "https://github.com/bazelbuild/skydoc/archive/1cdb612e31448c2f6eb25b8aa67d406152275482.zip",
        strip_prefix = "skydoc-1cdb612e31448c2f6eb25b8aa67d406152275482",
        sha256 = "282ab93ea7477ad703b3e8108a274c21344c3b59ee4e5b1e6a89cdbe3ecbe68f",
    )

    # Fetching the Bazel source code allows us to compile the Skylark linter
    http_archive(
        name = "io_bazel",
        url = "https://github.com/bazelbuild/bazel/archive/0.17.2.zip",
        strip_prefix = "bazel-0.17.2",
        sha256 = "a6d7ae3939e7bb2e410949adab8aa2759eda0b017bf5fc18658dc635552ce56e",
    )

    # Needed for Remote Build Execution
    # See https://releases.bazel.build/bazel-toolchains.html
    http_archive(
        name = "bazel_toolchains",
        urls = [
            "https://mirror.bazel.build/github.com/bazelbuild/bazel-toolchains/archive/bc0091adceaf4642192a8dcfc46e3ae3e4560ea7.tar.gz",
            "https://github.com/bazelbuild/bazel-toolchains/archive/bc0091adceaf4642192a8dcfc46e3ae3e4560ea7.tar.gz",
        ],
        strip_prefix = "bazel-toolchains-bc0091adceaf4642192a8dcfc46e3ae3e4560ea7",
        sha256 = "7e85a14821536bc24e04610d309002056f278113c6cc82f1059a609361812431",
    )

    http_archive(
        name = "bazel_skylib",
        url = "https://github.com/bazelbuild/bazel-skylib/archive/0.6.0.zip",
        strip_prefix = "bazel-skylib-0.6.0",
        sha256 = "54ee22e5b9f0dd2b42eb8a6c1878dee592cfe8eb33223a7dbbc583a383f6ee1a",
    )

def _maybe(repo_rule, name, **kwargs):
    if name not in native.existing_rules():
        repo_rule(name = name, **kwargs)
