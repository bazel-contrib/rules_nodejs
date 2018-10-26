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

load("@build_bazel_rules_nodejs//:defs.bzl", "npm_install")

def devserver_example_setup_workspace():
  """Node repositories for @devserver_examples
  """
  # yarn has a bug with installing local packages that are symlinked so use npm
  # See https://github.com/yarnpkg/yarn/issues/6037
  npm_install(
      name = "devserver_example_yarn_install",
      package_json = "@devserver_example//:package.json",
      data = [
          "@build_bazel_rules_nodejs//internal/babel_library:package.json",
          "@build_bazel_rules_nodejs//internal/babel_library:babel.js",
          "@build_bazel_rules_nodejs//internal/babel_library:yarn.lock",
      ],
  )
