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
# Protractor rules for Bazel

The Protractor rules run tests under the Protractor framework with Bazel.

## Installation

Add the `@bazel/protractor` npm package to your `devDependencies` in `package.json`.

## Known issues with running Chromium for macOS/Windows in Bazel

For macOS and Windows, Chromium comes with files that contain spaces in their file names. This breaks runfile tree
creation within Bazel due to a bug. There are various workarounds that allow for Chromium on these platforms:

* Instruct Bazel to automatically disable runfile tree creation if not needed. [More details here](https://github.com/bazelbuild/bazel/issues/4327#issuecomment-922106293)
* Instruct Bazel to use an alternative experimental approach for creating runfile trees. [More details here](https://github.com/bazelbuild/bazel/issues/4327#issuecomment-627422865)
"""

load(
    ":protractor_web_test.bzl",
    _protractor_web_test = "protractor_web_test",
    _protractor_web_test_suite = "protractor_web_test_suite",
)

protractor_web_test = _protractor_web_test
protractor_web_test_suite = _protractor_web_test_suite
