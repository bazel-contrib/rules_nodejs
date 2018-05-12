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

These rules let you run tests outside of a browser. This is typically faster
than launching a test in Karma, for example.
"""
load("//internal/node:node.bzl", "nodejs_test", "nodejs_binary")
load("//internal/common:devmode_js_sources.bzl", "devmode_js_sources")

def _jasmine_node_test(name, srcs = [], data = [], deps = [], nodejs_rule = nodejs_test, **kwargs):
  devmode_js_sources(
      name = "%s_devmode_srcs" % name,
      deps = srcs + deps,
      testonly = 1,
  )

  all_data = data + srcs + deps
  all_data += [Label("//internal/jasmine_node_test:jasmine_runner.js")]
  all_data += [":%s_devmode_srcs.MF" % name]
  entry_point = "build_bazel_rules_nodejs/internal/jasmine_node_test/jasmine_runner.js"

  nodejs_rule(
      name = name,
      data = all_data,
      entry_point = entry_point,
      templated_args = ["$(location :%s_devmode_srcs.MF)" % name],
      testonly = 1,
      **kwargs
  )

def jasmine_node_test(name, srcs = [], data = [], deps = [], **kwargs):
  """Runs tests in NodeJS using the Jasmine test runner and expects it to fail.

  To debug the test, see debugging notes in `nodejs_test`.

  Args:
    name: name of the resulting label
    srcs: JavaScript source files containing Jasmine specs
    data: Runtime dependencies which will be loaded while the test executes
    deps: Other targets which produce JavaScript, such as ts_library
    **kwargs: remaining arguments are passed to the test rule
  """
  _jasmine_node_test(name = name, srcs = srcs, data = data, deps = deps, nodejs_rule = nodejs_test, **kwargs)

def _xjasmine_node_test(
  name,
  size = None,
  timeout = None,
  shard_count = None,
  visibility = None,
  **kwargs):
  if 'flaky' in kwargs:
    fail('not supported for xfail_tests', 'flaky')
  if 'args' in kwargs:
    fail('not yet implemented for xfail_tests', 'args')
  if 'shard_count' in kwargs:
    fail('not yet implemented for xfail_tests', 'shard_count')

  _jasmine_node_test(
    name = "%s__wrapped" % name,
    visibility = ["//visibility:private"],
    nodejs_rule = nodejs_binary,
    **kwargs
  )

  native.sh_test(
    name = name,
    visibility = visibility,
    size = size,
    timeout = timeout,
    shard_count = shard_count,
    srcs = ["//internal/jasmine_node_test:xtest.sh"],
    data = [":%s__wrapped" % name],
    args = ['$(location :%s__wrapped)' % name],
  )

def xjasmine_node_test(name, srcs = [], data = [], deps = [], **kwargs):
  """Runs tests in NodeJS using the Jasmine test runner and expects it to fail.

  To debug the test, see debugging notes in `nodejs_test`.

  Args:
    name: name of the resulting label
    srcs: JavaScript source files containing Jasmine specs
    data: Runtime dependencies which will be loaded while the test executes
    deps: Other targets which produce JavaScript, such as ts_library
    **kwargs: remaining arguments are passed to the test rule
  """
  _xjasmine_node_test(name = name, srcs = srcs, data = data, deps = deps, **kwargs)