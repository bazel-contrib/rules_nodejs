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

load("@build_bazel_rules_nodejs//internal/common:sources_aspect.bzl", "sources_aspect")
load(
    "@build_bazel_rules_nodejs//internal/js_library:js_library.bzl",
    "write_amd_names_shim",
)
load(
    "@build_bazel_rules_nodejs//internal/web_package:web_package.bzl",
    "html_asset_inject",
)

# Helper function to convert a short path to a path that is
# found in the MANIFEST file.
def _short_path_to_manifest_path(ctx, short_path):
    if short_path.startswith("../"):
        return short_path[3:]
    else:
        return ctx.workspace_name + "/" + short_path

def _ts_devserver(ctx):
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
        for f in files.to_list()
    ]))

    amd_names_shim = ctx.actions.declare_file(
        "_%s.amd_names_shim.js" % ctx.label.name,
        sibling = ctx.outputs.script,
    )
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
        workspace_name + "/" + f.short_path + "\n"
        for f in script_files
    ]))

    devserver_runfiles = [
        ctx.executable._devserver,
        ctx.outputs.manifest,
        ctx.outputs.scripts_manifest,
    ]
    devserver_runfiles += ctx.files.static_files
    devserver_runfiles += script_files
    devserver_runfiles += ctx.files._bash_runfile_helpers

    if ctx.file.index_html:
        injected_index = ctx.actions.declare_file("index.html")
        bundle_script = ctx.attr.serving_path
        if bundle_script.startswith("/"):
            bundle_script = bundle_script[1:]
        html_asset_inject(
            ctx.file.index_html,
            ctx.actions,
            ctx.executable._injector,
            ctx.attr.additional_root_paths + [
                ctx.label.package,
                "/".join([ctx.bin_dir.path, ctx.label.package]),
                "/".join([ctx.genfiles_dir.path, ctx.label.package]),
            ],
            [f.path for f in ctx.files.static_files] + [bundle_script],
            injected_index,
        )
        devserver_runfiles += [injected_index]

    packages = depset(["/".join([workspace_name, ctx.label.package])] + ctx.attr.additional_root_paths)

    ctx.actions.expand_template(
        template = ctx.file._launcher_template,
        output = ctx.outputs.script,
        substitutions = {
            "TEMPLATED_entry_module": ctx.attr.entry_module,
            "TEMPLATED_main": _short_path_to_manifest_path(ctx, ctx.executable._devserver.short_path),
            "TEMPLATED_manifest": _short_path_to_manifest_path(ctx, ctx.outputs.manifest.short_path),
            "TEMPLATED_packages": ",".join(packages.to_list()),
            "TEMPLATED_port": str(ctx.attr.port),
            "TEMPLATED_scripts_manifest": _short_path_to_manifest_path(ctx, ctx.outputs.scripts_manifest.short_path),
            "TEMPLATED_serving_path": ctx.attr.serving_path if ctx.attr.serving_path else "",
            "TEMPLATED_workspace": workspace_name,
        },
        is_executable = True,
    )

    return [DefaultInfo(
        runfiles = ctx.runfiles(
            files = devserver_runfiles,
            # We don't expect executable targets to depend on the devserver, but if they do,
            # they can see the JavaScript code.
            transitive_files = depset(ctx.files.data, transitive = [files]),
            collect_data = True,
            collect_default = True,
        ),
    )]

ts_devserver = rule(
    implementation = _ts_devserver,
    attrs = {
        "additional_root_paths": attr.string_list(
            doc = """Additional root paths to serve static_files from.
            Paths should include the workspace name such as [\"__main__/resources\"]
            """,
        ),
        "bootstrap": attr.label_list(
            doc = "Scripts to include in the JS bundle before the module loader (require.js)",
            allow_files = [".js"],
        ),
        "data": attr.label_list(
            doc = "Dependencies that can be require'd while the server is running",
            allow_files = True,
        ),
        "entry_module": attr.string(
            doc = """The entry_module should be the AMD module name of the entry module such as `"__main__/src/index"`
            ts_devserver concats the following snippet after the bundle to load the application:
            `require(["entry_module"]);`
            """,
        ),
        "index_html": attr.label(
            allow_single_file = True,
            doc = """An index.html file, we'll inject the script tag for the bundle,
            as well as script tags for .js static_files and link tags for .css
            static_files""",
        ),
        "port": attr.int(
            doc = """The port that the devserver will listen on.""",
            default = 5432,
        ),
        "scripts": attr.label_list(
            doc = "User scripts to include in the JS bundle before the application sources",
            allow_files = [".js"],
        ),
        "serving_path": attr.string(
            # This default repeats the one in the go program. We make it explicit here so we can read it
            # when injecting scripts into the index file.
            default = "/_/ts_scripts.js",
            doc = """The path you can request from the client HTML which serves the JavaScript bundle.
            If you don't specify one, the JavaScript can be loaded at /_/ts_scripts.js""",
        ),
        "static_files": attr.label_list(
            doc = """Arbitrary files which to be served, such as index.html.
            They are served relative to the package where this rule is declared.""",
            allow_files = True,
        ),
        "deps": attr.label_list(
            doc = "Targets that produce JavaScript, such as `ts_library`",
            allow_files = True,
            aspects = [sources_aspect],
        ),
        "_bash_runfile_helpers": attr.label(default = Label("@bazel_tools//tools/bash/runfiles")),
        "_devserver": attr.label(
            # For local development in rules_typescript, we build the devserver from sources.
            # This requires that we have the go toolchain available.
            # NB: this value is replaced by "//devserver:server" in the packaged distro
            # //devserver:server is the pre-compiled binary.
            # That means that our users don't need the go toolchain.
            default = Label("//devserver:devserver_bin"),
            executable = True,
            cfg = "host",
        ),
        "_injector": attr.label(
            default = "@build_bazel_rules_nodejs//internal/web_package:injector",
            executable = True,
            cfg = "host",
        ),
        "_launcher_template": attr.label(allow_single_file = True, default = Label("//internal/devserver:launcher_template.sh")),
        "_requirejs_script": attr.label(allow_single_file = True, default = Label("@build_bazel_rules_typescript_devserver_deps//node_modules/requirejs:require.js")),
    },
    outputs = {
        "manifest": "%{name}.MF",
        "script": "%{name}.sh",
        "scripts_manifest": "scripts_%{name}.MF",
    },
)
"""ts_devserver is a simple development server intended for a quick "getting started" experience.

Additional documentation at https://github.com/alexeagle/angular-bazel-example/wiki/Running-a-devserver-under-Bazel
"""

def ts_devserver_macro(name, data = [], args = [], visibility = None, tags = [], testonly = 0, **kwargs):
    """Macro for creating a `ts_devserver`

    This macro re-exposes a `sh_binary` and `ts_devserver` target that can run the
    actual devserver implementation.
    The `ts_devserver` rule is just responsible for generating a launcher script
    that runs the Go devserver implementation. The `sh_binary` is the primary
    target that matches the specified "name" and executes the generated bash
    launcher script.
    This is re-exported in `//:defs.bzl` as `ts_devserver` so if you load the rule
    from there, you actually get this macro.
    Args:
      name: Name of the devserver target
      data: Runtime dependencies for the devserver
      args: Command line arguments that will be passed to the devserver Go implementation
      visibility: Visibility of the devserver targets
      tags: Standard Bazel tags, this macro adds a couple for ibazel
      testonly: Whether the devserver should only run in `bazel test`
      **kwargs: passed through to `ts_devserver`
    """
    ts_devserver(
        name = "%s_launcher" % name,
        data = data + ["@bazel_tools//tools/bash/runfiles"],
        testonly = testonly,
        visibility = ["//visibility:private"],
        tags = tags,
        **kwargs
    )

    native.sh_binary(
        name = name,
        args = args,
        # Users don't need to know that these tags are required to run under ibazel
        tags = tags + [
            # Tell ibazel not to restart the devserver when its deps change.
            "ibazel_notify_changes",
            # Tell ibazel to serve the live reload script, since we expect a browser will connect to
            # this program.
            "ibazel_live_reload",
        ],
        srcs = ["%s_launcher.sh" % name],
        data = [":%s_launcher" % name],
        testonly = testonly,
        visibility = visibility,
    )
