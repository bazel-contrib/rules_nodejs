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
#

"""Aspect to collect dev scripts from `deps` attribute.
"""

load("//internal/ng_apf_library:ng_apf_library.bzl", "ScriptsProvider")

DevScriptsProvider = provider(fields = ["dev_scripts"])

def _dev_scripts_aspect_impl(target, ctx):
    result = depset()

    # If target is a node module it'd provide a list of `scripts`.
    if ScriptsProvider in target:
        result = depset(transitive = [result, target[ScriptsProvider].scripts])

    # Recursively collect transitive `dev_scripts` from the deps.
    if hasattr(ctx.rule.attr, "deps"):
        for dep in ctx.rule.attr.deps:
            if DevScriptsProvider in dep:
                result = depset(transitive = [result, dep[DevScriptsProvider].dev_scripts])

    return [DevScriptsProvider(dev_scripts = result)]

dev_scripts_aspect = aspect(
    _dev_scripts_aspect_impl,
    attr_aspects = ["deps"],
)
