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

"""A mock ts_devserver rule.

Allows testing that babel_library will work with ts_devserver from
rules_typescript without introducing a circular dependency between
rules_nodejs and rules_typescript repositories.
"""

load(
  "@build_bazel_rules_nodejs//internal:node.bzl",
  "sources_aspect",
)
load(
  "@build_bazel_rules_nodejs//internal/js_library:js_library.bzl",
  "write_amd_names_shim",
)

def _mock_mock_typescript_devserver(ctx):
  files = depset()
  for d in ctx.attr.deps:
      if hasattr(d, "node_sources"):
          files = depset(transitive = [files, d.node_sources])
      elif hasattr(d, "files"):
          files = depset(transitive = [files, d.files])

  if ctx.label.workspace_root:
      # We need the workspace_name for the target being visited.
      # Skylark doesn't have this - instead they have a workspace_root
      # which looks like "external/repo_name" - so grab the second path segment.
      # TODO(alexeagle): investigate a better way to get the workspace name
      workspace_name = ctx.label.workspace_root.split("/")[1]
  else:
      workspace_name = ctx.workspace_name

  # Create a manifest file with the sources in arbitrary order, and without
  # bazel-bin prefixes ("root-relative paths").
  # TODO(alexeagle): we should experiment with keeping the files toposorted, to
  # see if we can get performance gains out of the module loader.
  ctx.actions.write(ctx.outputs.manifest, "".join([
      workspace_name + "/" + f.short_path + "\n"
      for f in files
  ]))

  amd_names_shim = ctx.actions.declare_file(
      "_%s.amd_names_shim.js" % ctx.label.name,
      sibling = ctx.outputs.manifest,
  )
  write_amd_names_shim(ctx.actions, amd_names_shim, ctx.attr.bootstrap)

  # Requirejs is always needed so its included as the first script
  # in script_files before any user specified scripts for the devserver
  # to concat in order.
  script_files = []
  script_files.extend(ctx.files.bootstrap)
  script_files.append(amd_names_shim)
  script_files.extend(ctx.files.scripts)
  ctx.actions.write(ctx.outputs.scripts_manifest, "".join([
      workspace_name + "/" + f.short_path + "\n"
      for f in script_files
  ]))

  devserver_runfiles = [
      ctx.outputs.manifest,
      ctx.outputs.scripts_manifest,
  ]
  devserver_runfiles += ctx.files.static_files
  devserver_runfiles += script_files

  serving_arg = ""
  if ctx.attr.serving_path:
      serving_arg = "-serving_path=%s" % ctx.attr.serving_path

  packages = depset(["/".join([workspace_name, ctx.label.package])] + ctx.attr.additional_root_paths)

  return [DefaultInfo(
    runfiles = ctx.runfiles(
      files = devserver_runfiles,
      transitive_files = depset(ctx.files.data, transitive = [files]),
      collect_data = True,
      collect_default = True,
    ),
  )]


mock_typescript_devserver = rule(
  implementation = _mock_mock_typescript_devserver,
  attrs = {
    "deps": attr.label_list(
        allow_files = True,
        aspects = [sources_aspect],
    ),
    "serving_path": attr.string(),
    "data": attr.label_list(
      allow_files = True,
    ),
    "static_files": attr.label_list(
      allow_files = True,
    ),
    "scripts": attr.label_list(
      allow_files = [".js"],
    ),
    "entry_module": attr.string(),
    "bootstrap": attr.label_list(
      allow_files = [".js"],
    ),
    "additional_root_paths": attr.string_list(),
    "port": attr.int(
        default = 5432,
    ),
  },
  outputs = {
    "manifest": "%{name}.MF",
    "scripts_manifest": "scripts_%{name}.MF",
  },
)
