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

ScriptsProvider = provider(fields = ["scripts"])

def _ng_apf_library_impl(ctx):
    umds = []
    factories = []
    summaries = []

    for file in ctx.files.srcs:
        if file.basename.endswith(".umd.js"):
            umds.append(file)
        elif file.basename.endswith(".ngfactory.js"):
            factories.append(file)
        elif file.basename.endswith(".ngsummary.js"):
            summaries.append(file)

    return [
        DefaultInfo(files = depset(
            transitive = [src.files for src in ctx.attr.srcs] + [dep.files for dep in ctx.attr.deps],
        )),
        ScriptsProvider(
            scripts = depset(umds + factories + summaries),
        ),
    ]

ng_apf_library = rule(
    implementation = _ng_apf_library_impl,
    attrs = {
        "srcs": attr.label_list(
            doc = "The list of files that comprise the package",
        ),
        "deps": attr.label_list(
            doc = "Flattened dependencies of the package",
        ),
    },
    doc = "Provides a replacement for the default filegroup target, with the addition of `scripts` provider.",
)
