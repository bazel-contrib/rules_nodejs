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

"""Contains the pkg_web rule.
"""

load("//:providers.bzl", "NODE_CONTEXT_ATTRS", "NodeContextInfo")

_DOC = """Assembles a web application from source files."""

_ATTRS = dict(NODE_CONTEXT_ATTRS, **{
    "additional_root_paths": attr.string_list(
        doc = """Path prefixes to strip off all srcs, in addition to the current package. Longest wins.""",
    ),
    "srcs": attr.label_list(
        allow_files = True,
        doc = """Files which should be copied into the package""",
    ),
    "substitutions": attr.string_dict(
        doc = """Key-value pairs which are replaced in all the files while building the package.
        
        You can use values from the workspace status command using curly braces, for example
        `{"0.0.0-PLACEHOLDER": "{STABLE_GIT_VERSION}"}`.
        See the section on stamping in the README.""",
    ),
    "_assembler": attr.label(
        default = "@build_bazel_rules_nodejs//internal/pkg_web:assembler",
        executable = True,
        cfg = "host",
    ),
})

def move_files(output_name, substitutions, version_file, info_file, stamp, files, action_factory, var, assembler, root_paths):
    """Moves files into an output directory

    Args:
      output_name: The name of the output directory
      substitutions: key/value pairs to replace
      version_file: bazel-out/volatile-status.txt
      info_file: bazel-out/stable-status.txt
      stamp: whether the build is performed with --stamp
      files: The files to move
      action_factory: Bazel's actions module from ctx.actions - see https://docs.bazel.build/versions/master/skylark/lib/actions.html
      var: environment variables
      assembler: The assembler executable
      root_paths: Path prefixes to strip off all srcs. Longest wins.

    Returns:
      The output directory tree-artifact
    """
    www_dir = action_factory.declare_directory(output_name)
    args = action_factory.args()
    inputs = files[:]
    args.add(www_dir.path)
    if stamp:
        args.add(version_file.path)
        inputs.append(version_file)
        args.add(info_file.path)
        inputs.append(info_file)
    else:
        args.add_all(["", ""])
    args.add(substitutions)
    args.add_all(root_paths)
    args.add("--assets")
    args.add_all([f.path for f in files])
    args.use_param_file("%s", use_always = True)

    action_factory.run(
        inputs = inputs,
        outputs = [www_dir],
        executable = assembler,
        arguments = [args],
        execution_requirements = {"local": "1"},
        env = {"COMPILATION_MODE": var["COMPILATION_MODE"]},
    )
    return depset([www_dir])

def additional_root_paths(ctx):
    return ctx.attr.additional_root_paths + [
        # also add additional_root_paths variants from genfiles dir and bin dir
        "/".join([ctx.genfiles_dir.path, p])
        for p in ctx.attr.additional_root_paths
    ] + [
        "/".join([ctx.bin_dir.path, p])
        for p in ctx.attr.additional_root_paths
    ] + [
        # package path is the root, including in bin/gen
        ctx.label.package,
        "/".join([ctx.bin_dir.path, ctx.label.package]),
        "/".join([ctx.genfiles_dir.path, ctx.label.package]),

        # bazel-bin/gen dirs to absolute paths
        ctx.genfiles_dir.path,
        ctx.bin_dir.path,

        # package re-rooted subdirectory
        "/".join([p for p in [ctx.bin_dir.path, ctx.label.package, "_" + ctx.label.name, ctx.label.package] if p]),
    ]

def _impl(ctx):
    root_paths = additional_root_paths(ctx)
    package_layout = move_files(
        ctx.label.name,
        ctx.attr.substitutions,
        ctx.version_file,
        ctx.info_file,
        ctx.attr.node_context_data[NodeContextInfo].stamp,
        ctx.files.srcs,
        ctx.actions,
        ctx.var,
        ctx.executable._assembler,
        root_paths,
    )
    return [
        DefaultInfo(files = package_layout),
    ]

pkg_web = rule(
    implementation = _impl,
    attrs = _ATTRS,
    doc = _DOC,
)
