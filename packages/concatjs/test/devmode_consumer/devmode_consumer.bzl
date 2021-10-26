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

"""Example of a rule that requires es2015 (devmode) inputs.
"""

load("@build_bazel_rules_nodejs//:providers.bzl", "JSNamedModuleInfo")

def _devmode_consumer(ctx):
    sources_depsets = []
    for dep in ctx.attr.deps:
        if JSNamedModuleInfo in dep:
            sources_depsets.append(dep[JSNamedModuleInfo].sources)
    sources = depset(transitive = sources_depsets)

    return [DefaultInfo(
        files = sources,
        runfiles = ctx.runfiles(transitive_files = sources),
    )]

devmode_consumer = rule(
    implementation = _devmode_consumer,
    attrs = {
        "deps": attr.label_list(),
    },
)
