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
load("@bazel_skylib//lib:versions.bzl", "versions")

def ts_setup_workspace():
    """This repository rule should be called from your WORKSPACE file.

    It creates some additional Bazel external repositories that are used internally
    by the TypeScript rules.
    """

    # 0.18.0: support for .bazelignore
    versions.check("0.18.0")

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
        commit = "f144a35ed4ac538fae93fa3783175108738f71b9",  # v0.5.8
        importpath = "github.com/google/go-cmp",
    )

    go_repository(
        name = "com_github_kylelemons_godebug",
        commit = "9ff306d4fbead574800b66369df5b6144732d58e",  # v1.1.0
        importpath = "github.com/kylelemons/godebug",
    )

    go_repository(
        name = "com_github_mattn_go_isatty",
        commit = "504425e14f742f1f517c4586048b49b37f829c8e",  # v0.0.14
        importpath = "github.com/mattn/go-isatty",
    )

# END-DEV-ONLY
