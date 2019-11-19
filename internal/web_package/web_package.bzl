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

"""Contains the web_package rule.
"""

def move_files(output_name, files, action_factory, assembler, root_paths):
    """Moves files into an output directory

    Args:
      output_name: The name of the output directory
      files: The files to move
      action_factory: Bazel's actions module from ctx.actions - see https://docs.bazel.build/versions/master/skylark/lib/actions.html
      assembler: The assembler executable
      root_paths: Path prefixes to strip off all assets. Longest wins.

    Returns:
      The output directory tree-artifact
    """
    www_dir = action_factory.declare_directory(output_name)
    args = action_factory.args()
    args.add(www_dir.path)
    args.add_all(root_paths)
    args.add("--assets")
    args.add_all([f.path for f in files])
    args.use_param_file("%s", use_always = True)
    action_factory.run(
        inputs = files,
        outputs = [www_dir],
        executable = assembler,
        arguments = [args],
        execution_requirements = {"local": "1"},
    )
    return depset([www_dir])

def additional_root_paths(ctx):
    return ctx.attr.additional_root_paths + [
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

def _web_package(ctx):
    root_paths = additional_root_paths(ctx)

    package_layout = move_files(
        ctx.label.name,
        ctx.files.assets,
        ctx.actions,
        ctx.executable._assembler,
        root_paths,
    )
    return [
        DefaultInfo(files = package_layout),
    ]

web_package = rule(
    implementation = _web_package,
    attrs = {
        "additional_root_paths": attr.string_list(
            doc = """Path prefixes to strip off all assets, in addition to the current package. Longest wins.""",
        ),
        "assets": attr.label_list(
            allow_files = True,
            doc = """Files which should be copied into the package""",
        ),
        "_assembler": attr.label(
            default = "@build_bazel_rules_nodejs//internal/web_package:assembler",
            executable = True,
            cfg = "host",
        ),
    },
    doc = """Assembles a web application from source files.

    Injects JS and CSS resources into the index.html.
    """,
)
