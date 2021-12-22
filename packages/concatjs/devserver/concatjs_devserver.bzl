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

load("@build_bazel_rules_nodejs//:providers.bzl", "ExternalNpmPackageInfo", "JSNamedModuleInfo", "node_modules_aspect")
load(
    "@build_bazel_rules_nodejs//internal/js_library:js_library.bzl",
    "write_amd_names_shim",
)

# Avoid using non-normalized paths (workspace/../other_workspace/path)
def _to_manifest_path(ctx, file):
    if file.short_path.startswith("../"):
        return file.short_path[3:]
    else:
        return ctx.workspace_name + "/" + file.short_path

def _concatjs_devserver(ctx):
    files_depsets = []
    for dep in ctx.attr.deps:
        if JSNamedModuleInfo in dep:
            files_depsets.append(dep[JSNamedModuleInfo].sources)
        if not JSNamedModuleInfo in dep and not ExternalNpmPackageInfo in dep and hasattr(dep, "files"):
            # These are javascript files provided by DefaultInfo from a direct
            # dep that has no JSNamedModuleInfo provider or ExternalNpmPackageInfo
            # provider (not an npm dep). These files must be in named AMD or named
            # UMD format.
            files_depsets.append(dep.files)
    files = depset(transitive = files_depsets)

    # Also include files from npm fine grained deps as inputs.
    # These deps are identified by the ExternalNpmPackageInfo provider.
    node_modules_depsets = []
    for dep in ctx.attr.deps:
        if ExternalNpmPackageInfo in dep:
            node_modules_depsets.append(dep[ExternalNpmPackageInfo].sources)
    node_modules = depset(transitive = node_modules_depsets)

    workspace_name = ctx.label.workspace_name if ctx.label.workspace_name else ctx.workspace_name

    # Create a manifest file with the sources in arbitrary order, and without
    # bazel-bin prefixes ("root-relative paths").
    # TODO(alexeagle): we should experiment with keeping the files toposorted, to
    # see if we can get performance gains out of the module loader.
    ctx.actions.write(ctx.outputs.manifest, "".join([
        workspace_name + "/" + f.short_path + "\n"
        for f in files.to_list()
        if f.path.endswith(".js")
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

    # With cross-platform RBE for OSX & Windows ctx.executable.devserver will be linux as --cpu and
    # --host_cpu must be overridden to k8. However, we still want to be able to run the devserver on the host
    # machine so we need to include the host devserver binary, which is ctx.executable.devserver_host, in the
    # runfiles. For non-RBE and for RBE with a linux host, ctx.executable.devserver & ctx.executable.devserver_host
    # will be the same binary.
    devserver_runfiles = [
        ctx.executable.devserver,
        ctx.executable.devserver_host,
        ctx.outputs.manifest,
        ctx.outputs.scripts_manifest,
    ]
    devserver_runfiles += ctx.files.static_files
    devserver_runfiles += script_files
    devserver_runfiles += ctx.files._bash_runfile_helpers

    packages = depset(["/".join([workspace_name, ctx.label.package])] + ctx.attr.additional_root_paths)

    ctx.actions.expand_template(
        template = ctx.file._launcher_template,
        output = ctx.outputs.script,
        substitutions = {
            "TEMPLATED_entry_module": ctx.attr.entry_module,
            "TEMPLATED_main": _to_manifest_path(ctx, ctx.executable.devserver),
            "TEMPLATED_manifest": _to_manifest_path(ctx, ctx.outputs.manifest),
            "TEMPLATED_packages": ",".join(packages.to_list()),
            "TEMPLATED_port": str(ctx.attr.port),
            "TEMPLATED_scripts_manifest": _to_manifest_path(ctx, ctx.outputs.scripts_manifest),
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
            transitive_files = depset(transitive = [files, node_modules]),
            collect_data = True,
            collect_default = True,
        ),
    )]

concatjs_devserver = rule(
    implementation = _concatjs_devserver,
    attrs = {
        "additional_root_paths": attr.string_list(
            doc = """Additional root paths to serve `static_files` from.
            Paths should include the workspace name such as `["__main__/resources"]`
            """,
        ),
        "bootstrap": attr.label_list(
            doc = "Scripts to include in the JS bundle before the module loader (require.js)",
            allow_files = [".js"],
        ),
        "deps": attr.label_list(
            doc = "Targets that produce JavaScript, such as `ts_library`",
            allow_files = True,
            aspects = [node_modules_aspect],
        ),
        "devserver": attr.label(
            doc = """Go based devserver executable.

            With cross-platform RBE for OSX & Windows ctx.executable.devserver will be linux as --cpu and
            --host_cpu must be overridden to k8. However, we still want to be able to run the devserver on the host
            machine so we need to include the host devserver binary, which is ctx.executable.devserver_host, in the
            runfiles. For non-RBE and for RBE with a linux host, ctx.executable.devserver & ctx.executable.devserver_host
            will be the same binary.

            Defaults to precompiled go binary setup by @bazel/typescript npm package""",
            default = Label("//packages/concatjs/devserver"),
            executable = True,
            cfg = "host",
        ),
        "devserver_host": attr.label(
            doc = """Go based devserver executable for the host platform.
            Defaults to precompiled go binary setup by @bazel/typescript npm package""",
            default = Label("//packages/concatjs/devserver"),
            executable = True,
            cfg = "host",
        ),
        "entry_module": attr.string(
            doc = """The `entry_module` should be the AMD module name of the entry module such as `"__main__/src/index".`
            `concatjs_devserver` concats the following snippet after the bundle to load the application:
            `require(["entry_module"]);`
            """,
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
        "_bash_runfile_helpers": attr.label(default = Label("@build_bazel_rules_nodejs//third_party/github.com/bazelbuild/bazel/tools/bash/runfiles")),
        "_launcher_template": attr.label(allow_single_file = True, default = Label("//packages/concatjs/devserver:launcher_template.sh")),
        "_requirejs_script": attr.label(allow_single_file = True, default = Label("//packages/concatjs/third_party/npm/requirejs:require.js")),
    },
    outputs = {
        "manifest": "%{name}.MF",
        "script": "%{name}.sh",
        "scripts_manifest": "scripts_%{name}.MF",
    },
    doc = """concatjs_devserver is a simple development server intended for a quick "getting started" experience.

Additional documentation [here](https://github.com/alexeagle/angular-bazel-example/wiki/Running-a-devserver-under-Bazel)
""",
)

def concatjs_devserver_macro(name, args = [], visibility = None, tags = [], testonly = 0, **kwargs):
    """Macro for creating a `concatjs_devserver`

    This macro re-exposes a `sh_binary` and `concatjs_devserver` target that can run the
    actual devserver implementation.
    The `concatjs_devserver` rule is just responsible for generating a launcher script
    that runs the Go devserver implementation. The `sh_binary` is the primary
    target that matches the specified "name" and executes the generated bash
    launcher script.
    This is re-exported in `//:index.bzl` as `concatjs_devserver` so if you load the rule
    from there, you actually get this macro.

    Args:
      name: Name of the devserver target
      args: Command line arguments that will be passed to the devserver Go implementation
      visibility: Visibility of the devserver targets
      tags: Standard Bazel tags, this macro adds a couple for ibazel
      testonly: Whether the devserver should only run in `bazel test`
      **kwargs: passed through to `concatjs_devserver`
    """
    concatjs_devserver(
        name = "%s_launcher" % name,
        testonly = testonly,
        visibility = ["//visibility:private"],
        tags = tags,
        **kwargs
    )

    # Expose the manifest file label
    native.alias(
        name = "%s.MF" % name,
        actual = "%s_launcher.MF" % name,
        tags = tags,
        visibility = visibility,
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
