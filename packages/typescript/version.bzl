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

"""Package file which defines npm_bazel_typescript version in skylark.

The version here is valid only when @npm_bazel_typescript is installed
via the @bazel/typescript npm package.
"""

load("@build_bazel_rules_nodejs//internal/common:check_version.bzl", "check_version")

VERSION = "0.0.0-PLACEHOLDER"

def check_rules_typescript_version(minimum_version_string):
    """
    Verify that a minimum npm_bazel_typescript is loaded a WORKSPACE.

    This version check only works when the @npm_bazel_typescript repository
    is installed via the @bazel/typescript and should not be used if installing
    @npm_bazel_typescript manually in your WORKSPACE via a function such as
    http_archive.

    This should be called from the `WORKSPACE` file so that the build fails as
    early as possible. For example:

    ```
    # in WORKSPACE:
    load("@npm_bazel_typescript//:version.bzl", "check_rules_typescript_version")
    check_rules_typescript_version(minimum_version_string = "0.31.1")
    ```

    Args:
      minimum_version_string: a string indicating the minimum version
    """
    if not check_version(VERSION, minimum_version_string):
        fail("\nCurrent npm_bazel_typescript version is {}, expected at least {}\n".format(
            VERSION,
            minimum_version_string,
        ))
