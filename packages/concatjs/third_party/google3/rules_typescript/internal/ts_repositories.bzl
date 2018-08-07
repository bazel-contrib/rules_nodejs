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

load("@build_bazel_rules_nodejs//:defs.bzl", "check_bazel_version", "check_rules_nodejs_version", "yarn_install")
load("@bazel_gazelle//:deps.bzl", "go_repository")

def ts_setup_workspace():
    """This repository rule should be called from your WORKSPACE file.

    It creates some additional Bazel external repositories that are used internally
    by the TypeScript rules.
    """

    # 0.14.0: @bazel_tools//tools/bash/runfiles is required
    # 0.15.0: "data" attributes don't need 'cfg = "data"'
    check_bazel_version("0.15.0")

    go_repository(
        name = "com_github_kylelemons_godebug",
        commit = "d65d576e9348f5982d7f6d83682b694e731a45c6",
        importpath = "github.com/kylelemons/godebug",
    )

    # 0.11.3: node module resolution fixes & check_rules_nodejs_version
    check_rules_nodejs_version("0.11.3")

    yarn_install(
        name = "build_bazel_rules_typescript_tsc_wrapped_deps",
        package_json = "@build_bazel_rules_typescript//internal:tsc_wrapped/package.json",
        yarn_lock = "@build_bazel_rules_typescript//internal:tsc_wrapped/yarn.lock",
    )

    yarn_install(
        name = "build_bazel_rules_typescript_devserver_deps",
        package_json = "@build_bazel_rules_typescript//internal/devserver:package.json",
        yarn_lock = "@build_bazel_rules_typescript//internal/devserver:yarn.lock",
    )

    yarn_install(
        name = "build_bazel_rules_typescript_karma_deps",
        package_json = "@build_bazel_rules_typescript//internal/karma:package.json",
        yarn_lock = "@build_bazel_rules_typescript//internal/karma:yarn.lock",
    )

    yarn_install(
        name = "build_bazel_rules_typescript_protobufs_compiletime_deps",
        package_json = "@build_bazel_rules_typescript//internal/protobufjs:package.json",
        yarn_lock = "@build_bazel_rules_typescript//internal/protobufjs:yarn.lock",
    )
