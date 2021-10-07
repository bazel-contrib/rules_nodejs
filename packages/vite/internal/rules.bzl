"""
vite rule
"""

load(":actions.bzl", "vite_build_action")
load("@build_bazel_rules_nodejs//:providers.bzl", "ExternalNpmPackageInfo", "JSEcmaScriptModuleInfo", "JSModuleInfo", "node_modules_aspect")
load("@build_bazel_rules_nodejs//internal/linker:link_node_modules.bzl", "module_mappings_aspect")

def _vite_build_impl(ctx):
    deps_depsets = []
    path_alias_mappings = dict()

    for dep in ctx.attr.deps:
        if JSEcmaScriptModuleInfo in dep:
            deps_depsets.append(dep[JSEcmaScriptModuleInfo].sources)

        if JSModuleInfo in dep:
            deps_depsets.append(dep[JSModuleInfo].sources)
        elif hasattr(dep, "files"):
            deps_depsets.append(dep.files)

        if DefaultInfo in dep:
            deps_depsets.append(dep[DefaultInfo].data_runfiles.files)

        if ExternalNpmPackageInfo in dep:
            deps_depsets.append(dep[ExternalNpmPackageInfo].sources)

    deps_inputs = depset(transitive = deps_depsets).to_list()

    inputs = deps_inputs + ctx.files.srcs

    inputs = [d for d in inputs if not (d.path.endswith(".d.ts") or d.path.endswith(".tsbuildinfo"))]

    prefix = ctx.label.name + "/"

    main_archive = ctx.actions.declare_directory(prefix)

    vite_build_action(
        ctx,
        srcs = inputs,
        out = main_archive,
    )

    return [DefaultInfo(
        files = depset([main_archive]),
        runfiles = ctx.runfiles(collect_data = True),
        executable = main_archive,
    )]

vite_build = rule(
    _vite_build_impl,
    attrs = {
        "srcs": attr.label_list(
            allow_files = True,
            doc = "Source files to compile for the main package of this binary",
        ),
        "deps": attr.label_list(
            default = [],
            aspects = [module_mappings_aspect, node_modules_aspect],
            doc = "A list of direct dependencies that are required to build the bundle",
        ),
        "data": attr.label_list(
            allow_files = True,
            doc = "Data files available to binaries using this library",
        ),
        "vite": attr.label(
            doc = "An executable target that runs Vite",
            default = Label("@npm//vite/bin:vite"),
            executable = True,
            cfg = "host",
        ),
    },
    doc = "Builds an executable program from Go source code",
)

def _to_manifest_path(ctx, file):
    if file.short_path.startswith("../"):
        return file.short_path[3:]
    else:
        return ctx.workspace_name + "/" + file.short_path

def _vite_dev_impl(ctx):
    deps_depsets = []

    path_alias_mappings = dict()

    for dep in ctx.attr.deps:
        if JSEcmaScriptModuleInfo in dep:
            deps_depsets.append(dep[JSEcmaScriptModuleInfo].sources)

        if JSModuleInfo in dep:
            deps_depsets.append(dep[JSModuleInfo].sources)
        elif hasattr(dep, "files"):
            deps_depsets.append(dep.files)

        if DefaultInfo in dep:
            deps_depsets.append(dep[DefaultInfo].data_runfiles.files)

        if ExternalNpmPackageInfo in dep:
            deps_depsets.append(dep[ExternalNpmPackageInfo].sources)

    deps_inputs = depset(transitive = deps_depsets).to_list()

    inputs = deps_inputs + ctx.files.srcs

    inputs = [d for d in inputs if not (d.path.endswith(".d.ts") or d.path.endswith(".tsbuildinfo"))]

    devserver_runfiles = [
        ctx.executable.vite,
    ]
    devserver_runfiles += inputs

    devserver_runfiles += ctx.files._bash_runfile_helpers

    workspace_name = ctx.label.workspace_name if ctx.label.workspace_name else ctx.workspace_name

    ctx.actions.expand_template(
        template = ctx.file._launcher_template,
        output = ctx.outputs.script,
        substitutions = {
            "TEMPLATED_main": _to_manifest_path(ctx, ctx.executable.vite),
            "TEMPLATED_workspace": workspace_name,
        },
        is_executable = True,
    )

    # return for the dev server
    return [DefaultInfo(
        runfiles = ctx.runfiles(
            files = devserver_runfiles,
            transitive_files = depset(inputs),
            collect_data = True,
            collect_default = True,
        ),
    )]

vite_dev = rule(
    _vite_dev_impl,
    attrs = {
        "srcs": attr.label_list(
            allow_files = True,
            doc = "Source files to compile for the main package of this binary",
        ),
        "deps": attr.label_list(
            default = [],
            aspects = [module_mappings_aspect, node_modules_aspect],
            doc = "A list of direct dependencies that are required to build the bundle",
        ),
        "data": attr.label_list(
            allow_files = True,
            doc = "Data files available to binaries using this library",
        ),
        "vite": attr.label(
            doc = "An executable target that runs Vite",
            default = Label("@npm//vite/bin:vite"),
            executable = True,
            cfg = "host",
        ),
        "_bash_runfile_helpers": attr.label(default = Label("@build_bazel_rules_nodejs//third_party/github.com/bazelbuild/bazel/tools/bash/runfiles")),
        "_launcher_template": attr.label(allow_single_file = True, default = Label("@build_bazel_rules_nodejs//packages/vite/internal:launcher_template.sh")),
    },
    outputs = {
        "script": "%{name}.sh",
    },
    doc = "Runs the dev server for vite",
)

def vite_devserver_macro(name, args = [], visibility = None, tags = [], testonly = 0, **kwargs):
    vite_dev(
        name = "%s_launcher" % name,
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
            # "ibazel_live_reload",
        ],
        srcs = ["%s_launcher.sh" % name],
        data = [":%s_launcher" % name],
        testonly = testonly,
        visibility = visibility,
    )
