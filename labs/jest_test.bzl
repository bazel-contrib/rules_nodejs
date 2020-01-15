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
"""A docstring"""

load("@npm//jest-cli:index.bzl", _jest_test = "jest_test")
load(":js_manifest.bzl", _js_manifest = "js_manifest")

def jest_test(name, jest_config, tests = [], data = [], **kwargs):
    """A docstring"""
    manifest = "%s_test_files" % name

    _js_manifest(
        name = manifest,
        srcs = tests,
        extensions = ["js", "jsx", "ts", "tsx", "mjs"],
    )

    templated_args = [
        "--no-cache",
        "--no-watchman",
        "--ci",
        "--config",
        "$(rootpath %s)" % jest_config,
        "--runTestsByPath",
        "$$(cat $(rootpath %s))" % manifest,
    ] + kwargs.pop("templated_args", [])

    data = data + tests + [jest_config, manifest]

    _jest_test(
        name = name,
        templated_args = templated_args,
        data = data,
        **kwargs
    )
