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

"""The ts_devserver rule brings up our "getting started" devserver.

See the README.md.
"""

load("@build_bazel_rules_nodejs//internal:node.bzl",
    "sources_aspect",
)

def _ts_devserver(ctx):
  files = depset()
  for d in ctx.attr.deps:
    if hasattr(d, "node_sources"):
      files += d.node_sources
    elif hasattr(d, "files"):
      files += d.files

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
    workspace_name + "/" + f.short_path + "\n" for f in files
  ]))

  # Requirejs is always needed so its included as the first script
  # in script_files before any user specified scripts for the devserver
  # to concat in order.
  script_files = depset()
  script_files += ctx.files._requirejs_script
  script_files += ctx.files.scripts
  ctx.actions.write(ctx.outputs.scripts_manifest, "".join([
    workspace_name + "/" + f.short_path + "\n" for f in script_files
  ]))

  devserver_runfiles = [
    ctx.executable._devserver,
    ctx.outputs.manifest,
    ctx.outputs.scripts_manifest,
    ctx.file._requirejs_script]
  devserver_runfiles += ctx.files.static_files
  devserver_runfiles += ctx.files.scripts

  serving_arg = ""
  if ctx.attr.serving_path:
    serving_arg = "-serving_path=%s" % ctx.attr.serving_path
  # FIXME: more bash dependencies makes Windows support harder
  ctx.actions.write(
      output = ctx.outputs.executable,
      is_executable = True,
      content = """#!/bin/sh
RUNFILES="$PWD/.."
{main} {serving_arg} \
  -base "$RUNFILES" \
  -packages={workspace}/{package} \
  -manifest={workspace}/{manifest} \
  -scripts_manifest={workspace}/{scripts_manifest} \
  -entry_module={entry_module} \
  "$@"
""".format(
    main = ctx.executable._devserver.short_path,
    serving_arg = serving_arg,
    workspace = workspace_name,
    package = ctx.label.package,
    manifest = ctx.outputs.manifest.short_path,
    scripts_manifest = ctx.outputs.scripts_manifest.short_path,
    entry_module = ctx.attr.entry_module))
  return [DefaultInfo(
      runfiles = ctx.runfiles(
          files = devserver_runfiles,
          # We don't expect executable targets to depend on the devserver, but if they do,
          # they can see the JavaScript code.
          transitive_files = depset(ctx.files.data) + files,
          collect_data = True,
          collect_default = True,
      )
  )]

ts_devserver = rule(
    implementation = _ts_devserver,
    attrs = {
        "deps": attr.label_list(allow_files = True, aspects = [sources_aspect]),
        "serving_path": attr.string(),
        "data": attr.label_list(allow_files = True, cfg = "data"),
        "static_files": attr.label_list(allow_files = True),
        # User scripts for the devserver to concat before the source files
        "scripts": attr.label_list(allow_files = True),
        # The entry_module should be the AMD module name of the entry module such as "__main__/src/index"
        # Devserver concats the following snippet after the bundle to load the application: require(["entry_module"]);
        "entry_module": attr.string(),
        "_requirejs_script": attr.label(allow_files = True, single_file = True, default = Label("@build_bazel_rules_typescript_devserver_deps//:node_modules/requirejs/require.js")),
        "_devserver": attr.label(
            default = Label("//internal/devserver/main"),
            executable = True,
            cfg = "host",
        ),
    },
    outputs = {
        "manifest": "%{name}.MF",
        "scripts_manifest": "scripts_%{name}.MF",
    },
    executable = True,
)

def ts_devserver_macro(tags = [], **kwargs):
  ts_devserver(
      # Users don't need to know that this tag is required to run under ibazel
      tags = tags + ["ibazel_notify_changes"],
      **kwargs
  )
