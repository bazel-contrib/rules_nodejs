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

"tsconfig.json files using extends"

TsConfigInfo = provider(
    doc = """Provides TypeScript configuration, in the form of a tsconfig.json file
        along with any transitively referenced tsconfig.json files chained by the
        "extends" feature""",
    fields = {
        "deps": "all tsconfig.json files needed to configure TypeScript",
    },
)

def _ts_config_impl(ctx):
    files = depset([ctx.file.src])
    transitive_deps = []
    for dep in ctx.attr.deps:
        if TsConfigInfo in dep:
            transitive_deps.extend(dep[TsConfigInfo].deps)
    return [
        DefaultInfo(files = files),
        TsConfigInfo(deps = [ctx.file.src] + ctx.files.deps + transitive_deps),
    ]

ts_config = rule(
    implementation = _ts_config_impl,
    attrs = {
        "deps": attr.label_list(
            doc = """Additional tsconfig.json files referenced via extends""",
            allow_files = True,
        ),
        "src": attr.label(
            doc = """The tsconfig.json file passed to the TypeScript compiler""",
            allow_single_file = True,
            mandatory = True,
        ),
    },
    doc = """Allows a tsconfig.json file to extend another file.

Normally, you just give a single `tsconfig.json` file as the tsconfig attribute
of a `ts_library` rule. However, if your `tsconfig.json` uses the `extends`
feature from TypeScript, then the Bazel implementation needs to know about that
extended configuration file as well, to pass them both to the TypeScript compiler.
""",
)
