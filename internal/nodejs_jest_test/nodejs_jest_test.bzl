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

"""Jest testing for NodeJS

These rules let you run tests with facebook/jest.
"""
load("//internal/node:node.bzl", "nodejs_test")

def nodejs_jest_test(
    name,
    srcs = [],
    data = [],
    deps = [],
    **kwargs):
    """Runs test with a jest.
    
    Args:
        name: Name of the resulting label
        srcs: JavaScript source files containing jest tests
        data: Runtime dependencies which will be loaded while the test executes
        deps: Other targets which produce JavaScript; should contain `jest` and `fs-extra`
        **kwargs: remaining arguments are passed to the test rule
    """

    npm_repo_workspace_name = None
    fs_extra_dep_name = None

    for dep in deps:
        if dep.endswith('//jest'):
            npm_repo_workspace_name = dep.replace('//jest', '').replace('@', '')
        elif dep.endswith('//fs-extra'):
            fs_extra_dep_name = dep

    if not npm_repo_workspace_name:
        fail('jest is not found in `deps`, please include it')

    if not fs_extra_dep_name:
        fail('fs-extra is not found in `deps`, please include it')

    all_data = data + srcs + deps
    all_data += [Label("//internal/nodejs_jest_test:jest_runner.js")]
    all_data += [Label("@bazel_tools//tools/bash/runfiles")]
    entry_point = "build_bazel_rules_nodejs/internal/nodejs_jest_test/jest_runner.js"


    nodejs_test(
        name = name,
        data = all_data,
        entry_point = entry_point,
        templated_args = [npm_repo_workspace_name, native.package_name()],
        **kwargs
    )
