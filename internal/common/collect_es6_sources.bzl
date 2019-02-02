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

"""Used by production rules to expose a file tree of only es6 files.

These are expected to be used by the production toolchain, such as bundlers.
The tree will be flattened, such that all the es6 files are under a single tree.
"""

def collect_es6_sources(ctx):
    """Returns a file tree containing only production files.

    Args:
        ctx: ctx.

    Returns:
        A file tree containing only production files.
    """

    non_rerooted_files = [d for d in ctx.files.deps if d.is_source]
    if hasattr(ctx.attr, "srcs"):
        non_rerooted_files += ctx.files.srcs
    for dep in ctx.attr.deps:
        if hasattr(dep, "typescript"):
            non_rerooted_files += dep.typescript.transitive_es6_sources.to_list()

    rerooted_files = []
    for file in non_rerooted_files:
        path = file.short_path
        if (path.startswith("../")):
            path = "external/" + path[3:]

        rerooted_file = ctx.actions.declare_file(
            "%s.es6/%s" % (
                ctx.label.name,
                # the .closure.js filename is an artifact of the rules_typescript layout
                # TODO(mrmeku): pin to end of string, eg. don't match foo.closure.jso.js
                path.replace(".closure.js", ".js"),
            ),
        )

        # Cheap way to create an action that copies a file
        # TODO(alexeagle): discuss with Bazel team how we can do something like
        # runfiles to create a re-rooted tree. This has performance implications.
        ctx.actions.expand_template(
            output = rerooted_file,
            template = file,
            substitutions = {},
        )
        rerooted_files += [rerooted_file]

    #TODO(mrmeku): we should include the files and closure_js_library contents too
    return depset(direct = rerooted_files)
