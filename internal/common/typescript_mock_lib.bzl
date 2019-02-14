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

"""A mock typescript_lib rule.

Allows testing that jasmine_node_test will work with ts_library from
rules_typescript without introducing a circular dependency between
rules_nodejs and rules_typescript repositories.
"""

def _mock_typescript_lib(ctx):
    es5_sources = depset()
    transitive_decls = depset()
    for s in ctx.attr.srcs:
        files_list = s.files.to_list()
        es5_sources = depset([f for f in files_list if f.path.endswith(".js")], transitive = [es5_sources])
        transitive_decls = depset([f for f in files_list if f.path.endswith(".d.ts")], transitive = [transitive_decls])
    return struct(
        runfiles = ctx.runfiles(collect_default = True, collect_data = True),
        typescript = struct(
            es5_sources = es5_sources,
            transitive_declarations = transitive_decls,
        ),
    )

mock_typescript_lib = rule(
    implementation = _mock_typescript_lib,
    attrs = {
        "srcs": attr.label_list(allow_files = True),
        "data": attr.label_list(allow_files = True),
    },
)
