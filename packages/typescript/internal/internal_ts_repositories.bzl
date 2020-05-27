# Copyright 2019 The Bazel Authors. All rights reserved.
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

"""Helper function to setup @bazel/typescript dev dependencies.
"""

load("@bazel_gazelle//:deps.bzl", "go_repository")

def ts_setup_dev_workspace():
    """
    Setup the toolchain needed for local development, but not needed by users.

    These needs to be in a separate file from ts_setup_workspace() so as not
    to leak load statements.
    """

    ts_setup_workspace()

    go_repository(
        name = "com_github_kylelemons_godebug",
        commit = "9ff306d4fbead574800b66369df5b6144732d58e",  # v1.1.0
        importpath = "github.com/kylelemons/godebug",
    )

    go_repository(
        name = "com_github_mattn_go_isatty",
        commit = "7b513a986450394f7bbf1476909911b3aa3a55ce",  # v0.0.12
        importpath = "github.com/mattn/go-isatty",
    )
