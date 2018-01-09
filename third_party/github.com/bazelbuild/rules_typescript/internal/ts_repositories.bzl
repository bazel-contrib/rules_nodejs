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

"""The ts_setup_workspace rule installs build-time dependencies.
"""

load("@build_bazel_rules_nodejs//:defs.bzl", "npm_install")

def ts_setup_workspace():
  npm_install(
      name = "build_bazel_rules_typescript_deps",
      package_json = "@build_bazel_rules_typescript//internal/tsc_wrapped:package.json",
  )
  npm_install(
      name = "build_bazel_rules_typescript_devserver_deps",
      package_json = "@build_bazel_rules_typescript//internal/devserver:package.json",
  )

  npm_install(
      name = "build_bazel_rules_typescript_karma_deps",
      package_json = "@build_bazel_rules_typescript//internal/karma:package.json",
  )
