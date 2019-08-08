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

"""Helper function to setup @e2e_packages workspace.
"""

load("@build_bazel_rules_nodejs//:defs.bzl", "npm_install", "yarn_install")

def e2e_packages_setup_workspace():
    """Node repositories for @e2e_packagess
    """
    npm_install(
        name = "e2e_packages_npm_install",
        package_json = "@e2e_packages//:npm1/package.json",
        package_lock_json = "@e2e_packages//:npm1/package-lock.json",
        data = ["@e2e_packages//:postinstall.js"],
        symlink_node_modules = False,
        # Just here as a smoke test for this attribute
        prod_only = True,
    )

    npm_install(
        name = "e2e_packages_npm_install_duplicate_for_determinism_testing",
        package_json = "@e2e_packages//:npm2/package.json",
        package_lock_json = "@e2e_packages//:npm2/package-lock.json",
        data = ["@e2e_packages//:postinstall.js"],
        symlink_node_modules = False,
    )

    yarn_install(
        name = "e2e_packages_yarn_install",
        package_json = "@e2e_packages//:yarn1/package.json",
        yarn_lock = "@e2e_packages//:yarn1/yarn.lock",
        data = ["@e2e_packages//:postinstall.js"],
        symlink_node_modules = False,
    )

    yarn_install(
        name = "e2e_packages_yarn_install_duplicate_for_determinism_testing",
        package_json = "@e2e_packages//:yarn2/package.json",
        yarn_lock = "@e2e_packages//:yarn2/yarn.lock",
        data = ["@e2e_packages//:postinstall.js"],
        symlink_node_modules = False,
    )
