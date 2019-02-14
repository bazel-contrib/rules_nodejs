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

"""Rollup bundling

The versions of Rollup and Uglify are controlled by the Bazel toolchain.
You do not need to install them into your project.
"""

load("//internal/common:collect_es6_sources.bzl", "collect_es6_sources")
load("//internal/common:module_mappings.bzl", "get_module_mappings")
load("//internal/common:node_module_info.bzl", "NodeModuleInfo", "collect_node_modules_aspect")

_ROLLUP_MODULE_MAPPINGS_ATTR = "rollup_module_mappings"

def _rollup_module_mappings_aspect_impl(target, ctx):
    mappings = get_module_mappings(target.label, ctx.rule.attr)
    return struct(rollup_module_mappings = mappings)

rollup_module_mappings_aspect = aspect(
    _rollup_module_mappings_aspect_impl,
    attr_aspects = ["deps"],
)

def _trim_package_node_modules(package_name):
    # trim a package name down to its path prior to a node_modules
    # segment. 'foo/node_modules/bar' would become 'foo' and
    # 'node_modules/bar' would become ''
    segments = []
    for n in package_name.split("/"):
        if n == "node_modules":
            break
        segments += [n]
    return "/".join(segments)

def write_rollup_config(ctx, plugins = [], root_dir = None, filename = "_%s.rollup.conf.js", output_format = "iife", additional_entry_points = []):
    """Generate a rollup config file.

    This is also used by the ng_rollup_bundle and ng_package rules in @angular/bazel.

    Args:
      ctx: Bazel rule execution context
      plugins: extra plugins (defaults to [])
               See the ng_rollup_bundle in @angular/bazel for example of usage.
      root_dir: root directory for module resolution (defaults to None)
      filename: output filename pattern (defaults to `_%s.rollup.conf.js`)
      output_format: passed to rollup output.format option, e.g. "umd"
      additional_entry_points: additional entry points for code splitting

    Returns:
      The rollup config file. See https://rollupjs.org/guide/en#configuration-files
    """
    config = ctx.actions.declare_file(filename % ctx.label.name)

    # build_file_path includes the BUILD.bazel file, transform here to only include the dirname
    build_file_dirname = "/".join(ctx.build_file_path.split("/")[:-1])

    entry_points = [ctx.attr.entry_point] + additional_entry_points

    mappings = dict()
    all_deps = ctx.attr.deps + ctx.attr.srcs
    for dep in all_deps:
        if hasattr(dep, _ROLLUP_MODULE_MAPPINGS_ATTR):
            for k, v in getattr(dep, _ROLLUP_MODULE_MAPPINGS_ATTR).items():
                if k in mappings and mappings[k] != v:
                    fail(("duplicate module mapping at %s: %s maps to both %s and %s" %
                          (dep.label, k, mappings[k], v)), "deps")
                mappings[k] = v

    if not root_dir:
        root_dir = "/".join([ctx.bin_dir.path, build_file_dirname, ctx.label.name + ".es6"])

    node_modules_root = None
    default_node_modules = False
    if ctx.files.node_modules:
        # ctx.files.node_modules is not an empty list
        node_modules_root = "/".join([f for f in [
            ctx.attr.node_modules.label.workspace_root,
            _trim_package_node_modules(ctx.attr.node_modules.label.package),
            "node_modules",
        ] if f])
    for d in ctx.attr.deps:
        if NodeModuleInfo in d:
            possible_root = "/".join(["external", d[NodeModuleInfo].workspace, "node_modules"])
            if not node_modules_root:
                node_modules_root = possible_root
            elif node_modules_root != possible_root:
                fail("All npm dependencies need to come from a single workspace. Found '%s' and '%s'." % (node_modules_root, possible_root))
    if not node_modules_root:
        # there are no fine grained deps and the node_modules attribute is an empty filegroup
        # but we still need a node_modules_root even if its empty
        workspace = ctx.attr.node_modules.label.workspace_root.split("/")[1] if ctx.attr.node_modules.label.workspace_root else ctx.workspace_name
        if workspace == "build_bazel_rules_nodejs" and ctx.attr.node_modules.label.package == "" and ctx.attr.node_modules.label.name == "node_modules_none":
            default_node_modules = True
        node_modules_root = "/".join([f for f in [
            ctx.attr.node_modules.label.workspace_root,
            ctx.attr.node_modules.label.package,
            "node_modules",
        ] if f])

    ctx.actions.expand_template(
        output = config,
        template = ctx.file._rollup_config_tmpl,
        substitutions = {
            "TMPL_additional_plugins": ",\n".join(plugins),
            "TMPL_banner_file": "\"%s\"" % ctx.file.license_banner.path if ctx.file.license_banner else "undefined",
            "TMPL_default_node_modules": "true" if default_node_modules else "false",
            "TMPL_global_name": ctx.attr.global_name if ctx.attr.global_name else ctx.label.name,
            "TMPL_inputs": ",".join(["\"%s\"" % e for e in entry_points]),
            "TMPL_module_mappings": str(mappings),
            "TMPL_node_modules_root": node_modules_root,
            "TMPL_output_format": output_format,
            "TMPL_rootDir": root_dir,
            "TMPL_stamp_data": "\"%s\"" % ctx.version_file.path if ctx.version_file else "undefined",
            "TMPL_target": str(ctx.label),
            "TMPL_workspace_name": ctx.workspace_name,
        },
    )

    return config

def run_rollup(ctx, sources, config, output):
    """Creates an Action that can run rollup on set of sources.

    This is also used by ng_package and ng_rollup_bundle rules in @angular/bazel.

    Args:
      ctx: Bazel rule execution context
      sources: JS sources to rollup
      config: rollup config file
      output: output file

    Returns:
      the sourcemap output file
    """
    map_output = ctx.actions.declare_file(output.basename + ".map", sibling = output)

    _run_rollup(ctx, sources, config, output, map_output)

    return map_output

def _filter_js_inputs(all_inputs):
    # Note: make sure that "all_inputs" is not a depset.
    # Iterating over a depset is deprecated!
    return [
        f
        for f in all_inputs
        if f.path.endswith(".js") or f.path.endswith(".json")
    ]

def _run_rollup(ctx, sources, config, output, map_output = None):
    args = ctx.actions.args()
    args.add_all(["--config", config.path])
    if map_output:
        args.add_all(["--output.file", output.path])
        args.add_all(["--output.sourcemap", "--output.sourcemapFile", map_output.path])
    else:
        args.add_all(["--output.dir", output.path])
        args.add_all(["--output.sourcemap"])

    # We will produce errors as needed. Anything else is spammy: a well-behaved
    # bazel rule prints nothing on success.
    args.add("--silent")

    if ctx.attr.globals:
        args.add("--external")
        args.add_joined(ctx.attr.globals.keys(), join_with = ",")
        args.add("--globals")
        args.add_joined(["%s:%s" % g for g in ctx.attr.globals.items()], join_with = ",")

    direct_inputs = [config]
    direct_inputs += _filter_js_inputs(ctx.files.node_modules)

    # Also include files from npm fine grained deps as inputs.
    # These deps are identified by the NodeModuleInfo provider.
    for d in ctx.attr.deps:
        if NodeModuleInfo in d:
            # Note: we can't avoid calling .to_list() on files
            direct_inputs += _filter_js_inputs(d.files.to_list())

    if ctx.file.license_banner:
        direct_inputs += [ctx.file.license_banner]
    if ctx.version_file:
        direct_inputs += [ctx.version_file]

    outputs = [output]
    if map_output:
        outputs += [map_output]

    ctx.actions.run(
        executable = ctx.executable._rollup,
        inputs = depset(direct_inputs, transitive = [sources]),
        outputs = outputs,
        arguments = [args],
    )

def _run_tsc(ctx, input, output):
    args = ctx.actions.args()
    args.add_all(["--target", "es5"])
    args.add("--allowJS")
    args.add(input.path)
    args.add_all(["--outFile", output.path])

    ctx.actions.run(
        executable = ctx.executable._tsc,
        inputs = [input],
        outputs = [output],
        arguments = [args],
    )

def _run_tsc_on_directory(ctx, input_dir, output_dir):
    config = ctx.actions.declare_file("_%s.code-split.tsconfig.json" % ctx.label.name)

    args = ctx.actions.args()
    args.add_all(["--project", config.path])
    args.add_all(["--input", input_dir.path])
    args.add_all(["--output", output_dir.path])

    ctx.actions.run(
        executable = ctx.executable._tsc_directory,
        inputs = [input_dir],
        outputs = [output_dir, config],
        arguments = [args],
    )

def run_uglify(ctx, input, output, debug = False, comments = True, config_name = None, in_source_map = None):
    """Runs uglify on an input file.

    This is also used by https://github.com/angular/angular.

    Args:
      ctx: Bazel rule execution context
      input: input file
      output: output file
      debug: if True then output is beautified (defaults to False)
      comments: if True then copyright comments are preserved in output file (defaults to True)
      config_name: allows callers to control the name of the generated uglify configuration,
          which will be `_[config_name].uglify.json` in the package where the target is declared
      in_source_map: sourcemap file for the input file, passed to the "--source-map content="
          option of rollup.

    Returns:
      The sourcemap file
    """

    map_output = ctx.actions.declare_file(output.basename + ".map", sibling = output)

    _run_uglify(ctx, input, output, map_output, debug, comments, config_name, in_source_map)

    return map_output

def _run_uglify(ctx, input, output, map_output, debug = False, comments = True, config_name = None, in_source_map = None):
    inputs = [input]
    outputs = [output]

    args = ctx.actions.args()

    if map_output:
        # Running uglify on an individual file
        if not config_name:
            config_name = ctx.label.name
            if debug:
                config_name += ".debug"
        config = ctx.actions.declare_file("_%s.uglify.json" % config_name)
        args.add_all(["--config-file", config.path])
        outputs += [map_output, config]

    args.add(input.path)
    args.add_all(["--output", output.path])

    # Source mapping options are comma-packed into one argv
    # see https://github.com/mishoo/UglifyJS2#command-line-usage
    source_map_opts = ["includeSources", "base=" + ctx.bin_dir.path]
    if in_source_map:
        source_map_opts.append("content=" + in_source_map.path)
        inputs.append(in_source_map)

    # This option doesn't work in the config file, only on the CLI
    args.add_all(["--source-map", ",".join(source_map_opts)])

    if comments:
        args.add("--comments")
    if debug:
        args.add("--debug")
        args.add("--beautify")

    ctx.actions.run(
        executable = ctx.executable._uglify_wrapped,
        inputs = inputs,
        outputs = outputs,
        arguments = [args],
    )

def run_sourcemapexplorer(ctx, js, map, output):
    """Runs source-map-explorer to produce an HTML visualization of the sourcemap.

    Args:
      ctx: bazel rule execution context
      js: Javascript bundle
      map: sourcemap from the bundle back to original sources
      output: file where the HTML report is written
    """

    # We must run in a shell in order to redirect stdout.
    # TODO(alexeagle): file a feature request on ctx.actions.run so that stdout
    # could be natively redirected to produce the output file
    ctx.actions.run_shell(
        inputs = [js, map],
        tools = [ctx.executable._source_map_explorer],
        outputs = [output],
        command = "$1 --html $2 $3 > $4",
        arguments = [
            ctx.executable._source_map_explorer.path,
            js.path,
            map.path,
            output.path,
        ],
    )

def _generate_code_split_entry(ctx, bundles_folder, output):
    """Generates a SystemJS boilerplate/entry point file.

    See doc for additional_entry_points for more information
    on purpose and usage of this generated file.

    The SystemJS packages map outputted to the file is generated
    from the entry_point and additional_entry_point attributes and
    is targetted as a specific bundle variant specified by `folder`.

    For example, a rollup_bundle in may be configured like so:

    ```
    rollup_bundle(
        name = "bundle",
        additional_entry_points = [
            "src/hello-world/hello-world.module.ngfactory",
            "src/todos/todos.module.ngfactory",
        ],
        entry_point = "src/main.prod",
        deps = ["//src"],
    )
    ```

    In this case, the main_entry_point_dirname will evaluate to
    `src/` and this will be stripped from the entry points for
    the map. If folder is `bundle.cs`, the generated SystemJS
    boilerplate/entry point file will look like:

    ```
    (function(global) {
    System.config({
      packages: {
        '': {map: {
          "./main.prod": "bundle.cs/main.prod",
          "./hello-world/hello-world.module.ngfactory": "bundle.cs/hello-world.module.ngfactory",
          "./todos/todos.module.ngfactory": "bundle.cs/todos.module.ngfactory"},
          defaultExtension: 'js'},
      }
    });
    System.import('main.prod').catch(function(err) {
      console.error(err);
    });
    })(this);
    ```

    Args:
      ctx: bazel rule execution context
      bundles_folder: the folder name with the bundled chunks to map to
      output: the file to generate
    """
    main_entry_point_basename = ctx.attr.entry_point.split("/")[-1]
    main_entry_point_dirname = "/".join(ctx.attr.entry_point.split("/")[:-1]) + "/"
    entry_points = {}
    for e in [ctx.attr.entry_point] + ctx.attr.additional_entry_points:
        entry_point = e[len(main_entry_point_dirname):]
        entry_points["./" + entry_point] = bundles_folder + "/" + entry_point.split("/")[-1]

    ctx.actions.expand_template(
        output = output,
        template = ctx.file._system_config_tmpl,
        substitutions = {
            "TMPL_entry_points": str(entry_points),
            "TMPL_main_entry_point": main_entry_point_basename,
        },
    )

def _rollup_bundle(ctx):
    if ctx.attr.additional_entry_points:
        # Generate code split bundles if additional entry points have been specified.
        # See doc for additional_entry_points for more information.
        # Note: ".cs" is needed on the output folders since ctx.label.name + ".es6" is already
        # a folder that contains the re-rooted es6 sources
        rollup_config = write_rollup_config(ctx, output_format = "cjs", additional_entry_points = ctx.attr.additional_entry_points)
        code_split_es6_output_dir = ctx.actions.declare_directory(ctx.label.name + ".cs.es6")
        _run_rollup(ctx, collect_es6_sources(ctx), rollup_config, code_split_es6_output_dir)
        code_split_es5_output_dir = ctx.actions.declare_directory(ctx.label.name + ".cs")
        _run_tsc_on_directory(ctx, code_split_es6_output_dir, code_split_es5_output_dir)
        code_split_es5_min_output_dir = ctx.actions.declare_directory(ctx.label.name + ".cs.min")
        _run_uglify(ctx, code_split_es5_output_dir, code_split_es5_min_output_dir, None)
        code_split_es5_min_debug_output_dir = ctx.actions.declare_directory(ctx.label.name + ".cs.min_debug")
        _run_uglify(ctx, code_split_es5_output_dir, code_split_es5_min_debug_output_dir, None, debug = True)

        # Generate the SystemJS boilerplate/entry point files
        _generate_code_split_entry(ctx, ctx.label.name + ".cs.es6", ctx.outputs.build_es6)
        _generate_code_split_entry(ctx, ctx.label.name + ".cs", ctx.outputs.build_es5)
        _generate_code_split_entry(ctx, ctx.label.name + ".cs.min", ctx.outputs.build_es5_min)
        _generate_code_split_entry(ctx, ctx.label.name + ".cs.min_debug", ctx.outputs.build_es5_min_debug)

        # There is no UMD/CJS bundle when code-splitting but we still need to satisfy the output
        _generate_code_split_entry(ctx, ctx.label.name + ".cs", ctx.outputs.build_umd)
        _generate_code_split_entry(ctx, ctx.label.name + ".cs", ctx.outputs.build_cjs)

        # There is no source map explorer output when code-splitting but we still need to satisfy the output
        ctx.actions.expand_template(
            output = ctx.outputs.explore_html,
            template = ctx.file._no_explore_html,
            substitutions = {},
        )
        files = [
            ctx.outputs.build_es6,
            ctx.outputs.build_es5,
            ctx.outputs.build_es5_min,
            ctx.outputs.build_es5_min_debug,
            code_split_es6_output_dir,
            code_split_es5_output_dir,
            code_split_es5_min_output_dir,
            code_split_es5_min_debug_output_dir,
        ]

    else:
        # Generate the bundles
        rollup_config = write_rollup_config(ctx)
        run_rollup(ctx, collect_es6_sources(ctx), rollup_config, ctx.outputs.build_es6)
        _run_tsc(ctx, ctx.outputs.build_es6, ctx.outputs.build_es5)
        source_map = run_uglify(ctx, ctx.outputs.build_es5, ctx.outputs.build_es5_min)
        run_uglify(ctx, ctx.outputs.build_es5, ctx.outputs.build_es5_min_debug, debug = True)
        cjs_rollup_config = write_rollup_config(ctx, filename = "_%s_cjs.rollup.conf.js", output_format = "cjs")
        run_rollup(ctx, collect_es6_sources(ctx), cjs_rollup_config, ctx.outputs.build_cjs)
        umd_rollup_config = write_rollup_config(ctx, filename = "_%s_umd.rollup.conf.js", output_format = "umd")
        run_rollup(ctx, collect_es6_sources(ctx), umd_rollup_config, ctx.outputs.build_umd)
        run_sourcemapexplorer(ctx, ctx.outputs.build_es5_min, source_map, ctx.outputs.explore_html)
        files = [ctx.outputs.build_es5_min, source_map]

    return DefaultInfo(files = depset(files), runfiles = ctx.runfiles(files))

# Expose our list of aspects so derivative rules can override the deps attribute and
# add their own additional aspects.
# If users are in a different repo and load the aspect themselves, they will create
# different Provider symbols (e.g. NodeModuleInfo) and we won't find them.
# So users must use these symbols that are load'ed in rules_nodejs.
ROLLUP_DEPS_ASPECTS = [rollup_module_mappings_aspect, collect_node_modules_aspect]

ROLLUP_ATTRS = {
    "srcs": attr.label_list(
        doc = """JavaScript source files from the workspace.
        These can use ES2015 syntax and ES Modules (import/export)""",
        allow_files = [".js"],
    ),
    "additional_entry_points": attr.string_list(
        doc = """Additional entry points of the application for code splitting, passed as the input to rollup.
        These should be a path relative to the workspace root.

        When additional_entry_points are specified, rollup_bundle
        will split the bundle in multiple entry points and chunks.
        There will be a main entry point chunk as well as entry point
        chunks for each additional_entry_point. The file names
        of these entry points will correspond to the file names
        specified in entry_point and additional_entry_points.
        There will also be one or more common chunks that are shared
        between entry points named chunk-<HASH>.js. The number
        of common chunks is variable depending on the code being
        bundled.

        Entry points and chunks will be outputted to folders:
        - <label-name>.cs.es6 // es6
        - <label-name>.cs // es5
        - <label-name>.cs.min // es5 minified
        - <label-name>.cs.min_debug // es5 minified debug

        The following files will be outputted that contain the
        SystemJS boilerplate to map the entry points to their file
        names and load the main entry point:
        flavors:
        - <label-name>.es6.js // es6
        - <label-name>.js // es5
        - <label-name>.min.js // es5 minified
        - <label-name>.min_debug.js // es5 minified debug

        NOTE: additional_entry_points MUST be in the same folder or deeper than
        the main entry_point for the SystemJS boilerplate/entry point to
        be valid. For example, if the main entry_point is
        `src/main` then all additional_entry_points must be under
        `src/**` such as `src/bar` or `src/foo/bar`. Alternate
        additional_entry_points configurations are valid but the
        SystemJS boilerplate/entry point files will not be usable and
        it is up to the user in these cases to handle the SystemJS
        boilerplate manually.

        It is sufficient to load one of these SystemJS boilerplate/entry point
        files as a script in your HTML to load your application""",
    ),
    "entry_point": attr.string(
        doc = """The starting point of the application, passed as the `--input` flag to rollup.
        This should be a path relative to the workspace root.
        """,
        mandatory = True,
    ),
    "global_name": attr.string(
        doc = """A name given to this package when referenced as a global variable.
        This name appears in the bundle module incantation at the beginning of the file,
        and governs the global symbol added to the global context (e.g. `window`) as a side-
        effect of loading the UMD/IIFE JS bundle.

        Rollup doc: "The variable name, representing your iife/umd bundle, by which other scripts on the same page can access it."

        This is passed to the `output.name` setting in Rollup.""",
    ),
    "globals": attr.string_dict(
        doc = """A dict of symbols that reference external scripts.
        The keys are variable names that appear in the program,
        and the values are the symbol to reference at runtime in a global context (UMD bundles).
        For example, a program referencing @angular/core should use ng.core
        as the global reference, so Angular users should include the mapping
        `"@angular/core":"ng.core"` in the globals.""",
        default = {},
    ),
    "license_banner": attr.label(
        doc = """A .txt file passed to the `banner` config option of rollup.
        The contents of the file will be copied to the top of the resulting bundles.
        Note that you can replace a version placeholder in the license file, by using
        the special version `0.0.0-PLACEHOLDER`. See the section on stamping in the README.""",
        allow_single_file = [".txt"],
    ),
    "node_modules": attr.label(
        doc = """Dependencies from npm that provide some modules that must be
        resolved by rollup.

        This attribute is DEPRECATED. As of version 0.13.0 the recommended approach
        to npm dependencies is to use fine grained npm dependencies which are setup
        with the `yarn_install` or `npm_install` rules. For example, in a rollup_bundle
        target that used the `node_modules` attribute,

        ```
        rollup_bundle(
          name = "bundle",
          ...
          node_modules = "//:node_modules",
        )
        ```

        which specifies all files within the `//:node_modules` filegroup
        to be inputs to the `bundle`. Using fine grained npm dependencies,
        `bundle` is defined with only the npm dependencies that are
        needed:

        ```
        rollup_bundle(
          name = "bundle",
          ...
          deps = [
              "@npm//foo",
              "@npm//bar",
              ...
          ],
        )
        ```

        In this case, only the `foo` and `bar` npm packages and their
        transitive deps are includes as inputs to the `bundle` target
        which reduces the time required to setup the runfiles for this
        target (see https://github.com/bazelbuild/bazel/issues/5153).

        The @npm external repository and the fine grained npm package
        targets are setup using the `yarn_install` or `npm_install` rule
        in your WORKSPACE file:

        yarn_install(
          name = "npm",
          package_json = "//:package.json",
          yarn_lock = "//:yarn.lock",
        )
        """,
        default = Label("//:node_modules_none"),
    ),
    "deps": attr.label_list(
        doc = """Other rules that produce JavaScript outputs, such as `ts_library`.""",
        aspects = ROLLUP_DEPS_ASPECTS,
    ),
    "_no_explore_html": attr.label(
        default = Label("@build_bazel_rules_nodejs//internal/rollup:no_explore.html"),
        allow_single_file = True,
    ),
    "_rollup": attr.label(
        executable = True,
        cfg = "host",
        default = Label("@build_bazel_rules_nodejs//internal/rollup:rollup"),
    ),
    "_rollup_config_tmpl": attr.label(
        default = Label("@build_bazel_rules_nodejs//internal/rollup:rollup.config.js"),
        allow_single_file = True,
    ),
    "_source_map_explorer": attr.label(
        executable = True,
        cfg = "host",
        default = Label("@build_bazel_rules_nodejs//internal/rollup:source-map-explorer"),
    ),
    "_system_config_tmpl": attr.label(
        default = Label("@build_bazel_rules_nodejs//internal/rollup:system.config.js"),
        allow_single_file = True,
    ),
    "_tsc": attr.label(
        executable = True,
        cfg = "host",
        default = Label("@build_bazel_rules_nodejs//internal/rollup:tsc"),
    ),
    "_tsc_directory": attr.label(
        executable = True,
        cfg = "host",
        default = Label("@build_bazel_rules_nodejs//internal/rollup:tsc-directory"),
    ),
    "_uglify_wrapped": attr.label(
        executable = True,
        cfg = "host",
        default = Label("@build_bazel_rules_nodejs//internal/rollup:uglify-wrapped"),
    ),
}

ROLLUP_OUTPUTS = {
    "build_cjs": "%{name}.cjs.js",
    "build_es5": "%{name}.js",
    "build_es5_min": "%{name}.min.js",
    "build_es5_min_debug": "%{name}.min_debug.js",
    "build_es6": "%{name}.es6.js",
    "build_umd": "%{name}.umd.js",
    "explore_html": "%{name}.explore.html",
}

rollup_bundle = rule(
    implementation = _rollup_bundle,
    attrs = ROLLUP_ATTRS,
    outputs = ROLLUP_OUTPUTS,
)
"""
Produces several bundled JavaScript files using Rollup and Uglify.

Load it with
`load("@build_bazel_rules_nodejs//:defs.bzl", "rollup_bundle")`

It performs this work in several separate processes:
1. Call rollup on the original sources
2. Downlevel the resulting code to es5 syntax for older browsers
3. Minify the bundle with Uglify, possibly with pretty output for human debugging.

The default output of a `rollup_bundle` rule is the non-debug-minified es5 bundle.

However you can request one of the other outputs with a dot-suffix on the target's name.
For example, if your `rollup_bundle` is named `my_rollup_bundle`, you can use one of these labels:

To request the ES2015 syntax (e.g. `class` keyword) without downleveling or minification, use the `:my_rollup_bundle.es6.js` label.
To request the ES5 downleveled bundle without minification, use the `:my_rollup_bundle.js` label
To request the debug-minified es5 bundle, use the `:my_rollup_bundle.min_debug.js` label.
To request a UMD-bundle, use the `:my_rollup_bundle.umd.js` label.
To request a CommonJS bundle, use the `:my_rollup_bundle.cjs.js` label.

You can also request an analysis from source-map-explorer by buildng the `:my_rollup_bundle.explore.html` label.
However this is currently broken for `rollup_bundle` ES5 mode because we use tsc for downleveling and
it doesn't compose the resulting sourcemaps with an input sourcemap.
See https://github.com/bazelbuild/rules_nodejs/issues/175

For debugging, note that the `rollup.config.js` and `uglify.config.json` files can be found in the bazel-bin folder next to the resulting bundle.

An example usage can be found in https://github.com/bazelbuild/rules_nodejs/tree/master/internal/e2e/rollup
"""
