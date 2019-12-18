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

"""Generates a params file from a list of arguments.
"""

_DOC = """Generates a file from arguments."""

_OUTPUTS = {"params": "%{name}.params"}

_ATTRS = {
    "args": attr.string_list(
        doc = """Arguments to concatenate into a params file.
        
Subject to $(location) substitutions""",
    ),
    "data": attr.label_list(
        doc = """Data for location expansions in args.""",
        allow_files = True,
    ),
}

def _impl(ctx):
    ctx.actions.write(
        output = ctx.outputs.params,
        content = "\n".join([ctx.expand_location(a, ctx.attr.data) for a in ctx.attr.args]),
    )
    return [
        DefaultInfo(files = depset([ctx.outputs.params])),
    ]

params_file = rule(
    implementation = _impl,
    attrs = _ATTRS,
    doc = _DOC,
    outputs = _OUTPUTS,
)
