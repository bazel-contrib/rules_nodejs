# Copyright 2019 The Bazel Authors. All rights reserved.
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

"""
# Jasmine rules for Bazel

The Jasmine rules run tests under the Jasmine framework with Bazel.

## Installation

Add the `@bazel/jasmine` npm package to your `devDependencies` in `package.json`.
"""

load(":jasmine_node_test.bzl", _jasmine_node_test = "jasmine_node_test")

jasmine_node_test = _jasmine_node_test
# DO NOT ADD MORE rules here unless they appear in the generated docsite.
# Run yarn stardoc to re-generate the docsite.
