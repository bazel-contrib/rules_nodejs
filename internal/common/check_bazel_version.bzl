# Copyright 2017 The Bazel Authors. All rights reserved.
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

"""Check Bazel version

We recommend forcing all users to update to at least the same version of Bazel
as the continuous integration, so they don't trip over incompatibilities with
rules used in the project.
"""

load("//third_party/github.com/bazelbuild/bazel-skylib:lib/versions.bzl", "versions")

# Check that a specific bazel version is being used.
# Args: minimum_bazel_version in the form "<major>.<minor>.<patch>"
def check_bazel_version(minimum_bazel_version, message):
    """
    Verify the users Bazel version is at least the given one.

    This can be used in rule implementations that depend on changes in Bazel,
    to warn users about a mismatch between the rule and their installed Bazel
    version.

    This should *not* be used in users WORKSPACE files. To locally pin your
    Bazel version, just create the .bazelversion file in your workspace.

    Args:
      minimum_bazel_version: a string indicating the minimum version
      message: DEPRECATED: does nothing

    Deprecated:
      use the versions.bzl helper from bazel-skylib instead.
    """
    versions.check(minimum_bazel_version)

# Check that a bazel version being used is in the version range.
# Args:
#   minimum_bazel_version in the form "<major>.<minor>.<patch>"
#   maximum_bazel_version in the form "<major>.<minor>.<patch>"
def check_bazel_version_range(minimum_bazel_version, maximum_bazel_version, message):
    """
    Verify the users Bazel version is in the version range.

    This should be called from the `WORKSPACE` file so that the build fails as
    early as possible. For example:

    ```
    # in WORKSPACE:
    load("@build_bazel_rules_nodejs//:index.bzl", "check_bazel_version_range")
    check_bazel_version_range("0.11.0", "0.22.0")
    ```
    Args:
      minimum_bazel_version: a string indicating the minimum version
      maximum_bazel_version: a string indicating the maximum version
      message: DEPRECATED: does nothing

    Deprecated:
      use the versions.bzl helper from bazel-skylib instead.
    """
    versions.check(minimum_bazel_version, maximum_bazel_version)
