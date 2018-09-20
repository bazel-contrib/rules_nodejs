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

"""Helper function to setup @package_example workspace.
"""

load("@build_bazel_rules_nodejs//:defs.bzl", "yarn_install", "npm_install")

def packages_example_setup_workspace():
  """Node repositories for @packages_examples
  """
  npm_install(
      name = "packages_example_npm_install",
      package_json = "@packages_example//:package.json",
      package_lock_json = "@packages_example//:package-lock.json",
      data = ["@packages_example//:postinstall.js"],
  )

  npm_install(
      name = "packages_example_npm_install_duplicate_for_determinism_testing",
      package_json = "@packages_example//:package.json",
      package_lock_json = "@packages_example//:package-lock.json",
      data = ["@packages_example//:postinstall.js"],
  )

  npm_install(
      name = "packages_example_npm_no_lockfile",
      package_json = "@packages_example//:package.json",
      data = ["@packages_example//:postinstall.js"],
  )

  yarn_install(
      name = "packages_example_yarn_install",
      package_json = "@packages_example//:package.json",
      yarn_lock = "@packages_example//:yarn.lock",
      data = ["@packages_example//:postinstall.js"],
  )

  yarn_install(
      name = "packages_example_yarn_install_duplicate_for_determinism_testing",
      package_json = "@packages_example//:package.json",
      yarn_lock = "@packages_example//:yarn.lock",
      data = ["@packages_example//:postinstall.js"],
  )
