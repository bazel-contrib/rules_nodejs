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
  """Creates a file tree containing only production es6 sources.

  Args:
    ctx: ctx.

  Returns:
    A file tree containing only production es6 sources.
  """
  rerooted_es6_sources = depset()
  for dep in ctx.attr.deps:
    if hasattr(dep, "typescript"):
      for es6_source in dep.typescript.transitive_es6_sources:
        rerooted_es6_source = ctx.actions.declare_file("/".join([f for f in [
          ctx.label.name + ".es6",
          "node_modules",
          "" if es6_source.owner.workspace_root else ctx.workspace_name,
          es6_source.short_path.replace("../", "").replace(".closure.js", ".js")
        ] if f]))
        ctx.actions.expand_template(
          output = rerooted_es6_source,
          template = es6_source,
          substitutions = {}
        )
        rerooted_es6_sources += [rerooted_es6_source]
    if hasattr(dep, "closure_js_library"):
      rerooted_es6_sources += dep.closure_js_library.srcs
    if hasattr(dep, "files"):
      rerooted_es6_sources += dep.files
    
  return rerooted_es6_sources
