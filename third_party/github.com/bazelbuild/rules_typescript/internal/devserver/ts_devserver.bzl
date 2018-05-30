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

"Simple development server"

load("@build_bazel_rules_nodejs//internal:node.bzl",
    "sources_aspect",
)
load("@build_bazel_rules_nodejs//internal/js_library:js_library.bzl",
    "write_amd_names_shim",
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

  amd_names_shim = ctx.actions.declare_file(
      "_%s.amd_names_shim.js" % ctx.label.name,
      sibling = ctx.outputs.executable)
  write_amd_names_shim(ctx.actions, amd_names_shim, ctx.attr.bootstrap)

  # Requirejs is always needed so its included as the first script
  # in script_files before any user specified scripts for the devserver
  # to concat in order.
  script_files = []
  script_files.extend(ctx.files.bootstrap)
  script_files.append(ctx.file._requirejs_script)
  script_files.append(amd_names_shim)
  script_files.extend(ctx.files.scripts)
  ctx.actions.write(ctx.outputs.scripts_manifest, "".join([
    workspace_name + "/" + f.short_path + "\n" for f in script_files
  ]))

  devserver_runfiles = [
    ctx.executable._devserver,
    ctx.outputs.manifest,
    ctx.outputs.scripts_manifest,
  ]
  devserver_runfiles += ctx.files.static_files
  devserver_runfiles += script_files

  serving_arg = ""
  if ctx.attr.serving_path:
    serving_arg = "-serving_path=%s" % ctx.attr.serving_path

  packages = depset(["/".join([workspace_name, ctx.label.package])] + ctx.attr.additional_root_paths)

  # FIXME: more bash dependencies makes Windows support harder
  ctx.actions.write(
      output = ctx.outputs.executable,
      is_executable = True,
      content = """#!/bin/sh
RUNFILES="$PWD/.."
{main} {serving_arg} \
  -base="$RUNFILES" \
  -packages={packages} \
  -manifest={workspace}/{manifest} \
  -scripts_manifest={workspace}/{scripts_manifest} \
  -entry_module={entry_module} \
  -port={port} \
  "$@"
""".format(
    main = ctx.executable._devserver.short_path,
    serving_arg = serving_arg,
    workspace = workspace_name,
    packages = ",".join(packages.to_list()),
    manifest = ctx.outputs.manifest.short_path,
    scripts_manifest = ctx.outputs.scripts_manifest.short_path,
    entry_module = ctx.attr.entry_module,
    port = str(ctx.attr.port)))
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
        "deps": attr.label_list(
            doc = "Targets that produce JavaScript, such as `ts_library`",
            allow_files = True, aspects = [sources_aspect]),
        "serving_path": attr.string(
            doc = """The path you can request from the client HTML which serves the JavaScript bundle.
            If you don't specify one, the JavaScript can be loaded at /_/ts_scripts.js"""),
        "data": attr.label_list(
            doc = "Dependencies that can be require'd while the server is running",
            allow_files = True, cfg = "data"),
        "static_files": attr.label_list(
            doc = """Arbitrary files which to be served, such as index.html.
            They are served relative to the package where this rule is declared.""",
            allow_files = True),
        "scripts": attr.label_list(
            doc = "User scripts to include in the JS bundle before the application sources",
            allow_files = [".js"]),
        "entry_module": attr.string(
            doc = """The entry_module should be the AMD module name of the entry module such as `"__main__/src/index"`
            ts_devserver concats the following snippet after the bundle to load the application:
            `require(["entry_module"]);`
            """),
        "bootstrap": attr.label_list(
            doc = "Scripts to include in the JS bundle before the module loader (require.js)",
            allow_files = [".js"]),
        "additional_root_paths": attr.string_list(
            doc = """Additional root paths to serve static_files from.
            Paths should include the workspace name such as [\"__main__/resources\"]
            """),
        "port": attr.int(
            doc = """The port that the devserver will listen on.""",
            default = 5432),
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
"""ts_devserver is a simple development server intended for a quick "getting started" experience.

Additional documentation at https://github.com/alexeagle/angular-bazel-example/wiki/Running-a-devserver-under-Bazel
"""

def ts_devserver_macro(tags = [], **kwargs):
  """ibazel wrapper for `ts_devserver`

  This macro re-exposes the `ts_devserver` rule with some extra tags so that
  it behaves correctly under ibazel.

  This is re-exported in `//:defs.bzl` as `ts_devserver` so if you load the rule
  from there, you actually get this macro.

  Args:
    tags: standard Bazel tags, this macro adds a couple for ibazel
    **kwargs: passed through to `ts_devserver`
  """
  ts_devserver(
      # Users don't need to know that these tags are required to run under ibazel
      tags = tags + [
          # Tell ibazel not to restart the devserver when its deps change.
          "ibazel_notify_changes",
          # Tell ibazel to serve the live reload script, since we expect a browser will connect to
          # this program.
          "ibazel_live_reload",
      ],
      **kwargs
  )
