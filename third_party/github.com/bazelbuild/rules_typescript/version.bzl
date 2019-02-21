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

"""Package file which defines npm_bazel_typescript version in skylark
"""

load("@build_bazel_rules_nodejs//internal/common:check_version.bzl", "check_version")

VERSION = "0.25.1"

# This version is the minimum version that is API compatible with this version
# of rules_typescript. This version should be updated to equal VERSION for
# releases with breaking changes and/or new features.
COMPAT_VERSION = "0.25.0"

def check_rules_typescript_version(version_string):
    """
    Verify that a compatible npm_bazel_typescript is loaded a WORKSPACE.

    Where COMPAT_VERSION and VERSION come from the npm_bazel_typescript that
    is loaded in a WORKSPACE, this function will check:

    VERSION >= version_string >= COMPAT_VERSION

    This should be called from the `WORKSPACE` file so that the build fails as
    early as possible. For example:

    ```
    # in WORKSPACE:
    load("@npm_bazel_typescript//:defs.bzl", "check_rules_typescript_version")
    check_rules_typescript_version(version_string = "0.22.0")
    ```

    Args:
      version_string: A version string to check for compatibility with the loaded version
                      of npm_bazel_typescript. The version check performed is
                      `VERSION >= version_string >= COMPAT_VERSION` where VERSION and COMPAT_VERSION
                      come from the loaded version of npm_bazel_typescript.
    """
    if not check_version(VERSION, version_string) or not check_version(version_string, COMPAT_VERSION):
        fail("\nLoaded npm_bazel_typescript version {} with mimimum compat version of {} is not compatible with checked version {}!\n\n".format(
            VERSION,
            COMPAT_VERSION,
            version_string,
        ))
