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

"""NodeJS testing

These rules let you run tests using the Mocha library.

Unlike the typical mocha testing setup, we do not use the mocha binary that is
provided by the mocha library. The method used by these rules to patch the
module loader with extra module name -> path mappings (node_loader.js) does not
persist across processes. The mocha binary provided by the mocha library
ultimately spawns a new process to run the actual tests, and so the patched
module loader will not be respected. This approach instead programmatically runs
the Mocha library on the desired files; see
https://github.com/mochajs/mocha/wiki/Using-mocha-programmatically.
"""
load("//internal/node:node.bzl", "nodejs_test")

def mocha_node_test(
  name,
  test_entrypoints = [], # these should NOT contain the preceding workspace name.
  srcs = [],
  data = [],
  expected_exit_code = 0,
  **kwargs):
  """Runs tests in NodeJS using the Mocha test framework.

  To debug the test, see debugging notes in `nodejs_test`.

  Args:
    name: name of the resulting label.
    test_entrypoints: full paths to your files containing mocha tests, NOT containing the preceding workspace name.
    srcs: spec files containing assertions
    data: Runtime dependencies that the mocha tests need access to.
    expected_exit_code: The expected exit code for the test. Defaults to 0.
    **kwargs: remaining arguments passed to the test rule
  """

  all_data = data + srcs
  all_data += [Label("//internal/mocha_node_test:mocha_runner.js")]
  all_data += [Label("@bazel_tools//tools/bash/runfiles")]
  entry_point = "build_bazel_rules_nodejs/internal/mocha_node_test/mocha_runner.js"

  nodejs_test(
      name = name,
      data = all_data,
      entry_point = entry_point,
      templated_args = test_entrypoints,
      testonly = 1,
      expected_exit_code = expected_exit_code,
      **kwargs
  )
