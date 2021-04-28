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
# Terser rules for Bazel

The Terser rules run the Terser JS minifier with Bazel.

Wraps the Terser CLI documented at https://github.com/terser-js/terser#command-line-usage

## Installation

Add the `@bazel/terser` npm package to your `devDependencies` in `package.json`.

## Installing with user-managed dependencies

If you didn't use the `yarn_install` or `npm_install` rule, you'll have to declare a rule in your root `BUILD.bazel` file to execute terser:

```python
# Create a terser rule to use in terser_minified#terser_bin
# attribute when using user-managed dependencies
nodejs_binary(
    name = "terser_bin",
    entry_point = "//:node_modules/terser/bin/uglifyjs",
    # Point bazel to your node_modules to find the entry point
    data = ["//:node_modules"],
)
```
"""

load(":terser_minified.bzl", _terser_minified = "terser_minified")

terser_minified = _terser_minified
