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

def ts_setup_workspace():
    """This repository rule should be called from your WORKSPACE file.

    It creates some additional Bazel external repositories that are used internally
    by the TypeScript rules.
    """

    # 0.18.0: support for .bazelignore
    check_bazel_version("0.18.0")

    # 0.16.8: ng_package fix for packaging binary files
    check_rules_nodejs_version("0.16.8")

    yarn_install(
        name = "build_bazel_rules_typescript_devserver_deps",
        package_json = "@npm_bazel_typescript//internal/devserver:package.json",
        yarn_lock = "@npm_bazel_typescript//internal/devserver:yarn.lock",
        # Do not symlink node_modules as when used in downstream repos we should not create
        # node_modules folders in the @npm_bazel_typescript external repository. This is
        # not supported by managed_directories.
        symlink_node_modules = False,
    )

    yarn_install(
        name = "build_bazel_rules_typescript_protobufs_compiletime_deps",
        package_json = "@npm_bazel_typescript//internal/protobufjs:package.json",
        yarn_lock = "@npm_bazel_typescript//internal/protobufjs:yarn.lock",
        # Do not symlink node_modules as when used in downstream repos we should not create
        # node_modules folders in the @npm_bazel_typescript external repository. This is
        # not supported by managed_directories.
        symlink_node_modules = False,
    )
