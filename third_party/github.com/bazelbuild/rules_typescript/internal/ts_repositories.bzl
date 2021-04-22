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

"Install toolchain dependencies"

# BEGIN-DEV-ONLY
# Parts of this BUILD file only necessary when building within the bazelbuild/rules_typescript repo.
# The generated `@bazel/typescript` npm package contains a trimmed BUILD file using # DEV-ONLY fences.
load("@bazel_gazelle//:deps.bzl", "go_repository")

# END-DEV-ONLY

def ts_setup_workspace():
    "DEPRECATED: This repository rule does nothing and may be removed in the future."
    pass

# BEGIN-DEV-ONLY
def ts_setup_dev_workspace():
    """
    Setup the toolchain needed for local development, but not needed by users.

    These needs to be in a separate file from ts_setup_workspace() so as not
    to leak load statements.
    """

    ts_setup_workspace()

    go_repository(
        name = "com_github_google_go_cmp",
        commit = "2d0692c2e9617365a95b295612ac0d4415ba4627",
        importpath = "github.com/google/go-cmp",
    )

    go_repository(
        name = "com_github_kylelemons_godebug",
        commit = "d65d576e9348f5982d7f6d83682b694e731a45c6",
        importpath = "github.com/kylelemons/godebug",
    )

    go_repository(
        name = "com_github_mattn_go_isatty",
        commit = "3fb116b820352b7f0c281308a4d6250c22d94e27",
        importpath = "github.com/mattn/go-isatty",
    )

# END-DEV-ONLY
