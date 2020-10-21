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

"""Helpers for configuring the TypeScript compiler.
"""

load(":common/module_mappings.bzl", "get_module_mappings")

_DEBUG = False

def create_tsconfig(
        ctx,
        files,
        srcs,
        devmode_manifest = None,
        tsickle_externs = None,
        type_blacklisted_declarations = [],
        out_dir = None,
        disable_strict_deps = False,
        allowed_deps = depset(),
        extra_root_dirs = [],
        module_path_prefixes = None,
        module_roots = None,
        node_modules_root = None,
        type_check = True):
    """Creates an object representing the TypeScript configuration to run the compiler under Bazel.

    Args:
      ctx: the skylark execution context
      files: Labels of all TypeScript compiler inputs
      srcs: Immediate sources being compiled, as opposed to transitive deps.
      devmode_manifest: path to the manifest file to write for --target=es5
      tsickle_externs: path to write tsickle-generated externs.js.
      type_blacklisted_declarations: types declared in these files will never be
          mentioned in generated .d.ts.
      out_dir: directory for generated output. Default is ctx.bin_dir
      disable_strict_deps: whether to disable the strict deps check
      allowed_deps: the set of files that code in srcs may depend on (strict deps)
      extra_root_dirs: Extra root dirs to be passed to tsc_wrapped.
      module_path_prefixes: additional locations to resolve modules
      module_roots: standard locations to resolve modules
      node_modules_root: the node_modules root path

    Returns:
      A nested dict that corresponds to a tsconfig.json structure
    """
    if (type(files) != type([])):
        fail("expected files argument to be a list, got " + type(files))

    outdir_path = out_dir if out_dir != None else ctx.configuration.bin_dir.path

    # Callers can choose the filename for the tsconfig, but it must always live
    # in the output directory corresponding with the label where it's declared.
    tsconfig_dir = "/".join([
        p
        for p in [
            ctx.bin_dir.path,
            ctx.label.workspace_root,
            ctx.label.package,
        ] + ctx.label.name.split("/")[:-1]
        # Skip empty path segments (eg. workspace_root when in same repo)
        if p
    ])
    workspace_path = "/".join([".."] * len(tsconfig_dir.split("/")))
    if module_path_prefixes == None:
        module_path_prefixes = [
            "",
            ctx.configuration.genfiles_dir.path + "/",
            ctx.configuration.bin_dir.path + "/",
        ]
    if module_roots == None:
        base_path_mappings = ["%s/*" % p for p in [
            ".",
            ctx.configuration.genfiles_dir.path,
            ctx.configuration.bin_dir.path,
        ]]

        node_modules_mappings = []
        if hasattr(ctx.attr, "node_modules"):
            node_modules_mappings.append("/".join([p for p in [
                node_modules_root,
                "*",
            ] if p]))

            # TypeScript needs to look up ambient types from a 'node_modules'
            # directory, but when Bazel manages the dependencies, this directory
            # isn't in the project so TypeScript won't find it.
            # We can add it to the path mapping to make this lookup work.
            # See https://github.com/bazelbuild/rules_typescript/issues/179
            node_modules_mappings.append("/".join([p for p in [
                node_modules_root,
                "@types",
                "*",
            ] if p]))

        module_roots = {
            "*": node_modules_mappings,
            ctx.workspace_name + "/*": base_path_mappings,
        }
    module_mappings = get_module_mappings(ctx.label, ctx.attr, srcs = srcs)

    # To determine the path for auto-imports, TypeScript's language service
    # considers paths in the order they appear in tsconfig.json.
    # We want explicit module mappings ("@angular/core") to take precedence over
    # the general "*" mapping (which would create "third_party/javascript/..."),
    # so we create a new hash that contains the module_mappings and insert the
    # default lookup locations at the end.
    mapped_module_roots = {}
    for name, path in module_mappings.items():
        # Each module name maps to the immediate path, to resolve "index(.d).ts",
        # or module mappings that directly point to files (like index.d.ts).
        mapped_module_roots[name] = [
            "%s%s" % (p, path.replace(".d.ts", ""))
            for p in module_path_prefixes
        ]
        if not path.endswith(".d.ts"):
            # If not just mapping to a single .d.ts file, include a path glob that
            # maps the entire module root.
            mapped_module_roots["{}/*".format(name)] = [
                "%s%s/*" % (p, path)
                for p in module_path_prefixes
            ]
    for name, path in module_roots.items():
        mapped_module_roots[name] = path

    # Options for running the TypeScript compiler under Bazel.
    # See javascript/typescript/compiler/tsc_wrapped.ts:BazelOptions.
    # Unlike compiler_options, the paths here are relative to the rootDir,
    # not the location of the tsconfig.json file.
    # @unsorted-dict-items preserve historical order for golden tests
    bazel_options = {
        "workspaceName": ctx.workspace_name,
        "target": str(ctx.label),
        "package": ctx.label.package,
        "tsickleGenerateExterns": getattr(ctx.attr, "generate_externs", True),
        "tsickleExternsPath": tsickle_externs.path if tsickle_externs else "",
        "untyped": not getattr(ctx.attr, "tsickle_typed", False),
        "typeBlackListPaths": [f.path for f in type_blacklisted_declarations],
        # This is overridden by first-party javascript/typescript/tsconfig.bzl
        "ignoreWarningPaths": [],
        "es5Mode": devmode_manifest != None,
        "manifest": devmode_manifest if devmode_manifest else "",
        # Explicitly tell the compiler which sources we're interested in (emitting
        # and type checking).
        "compilationTargetSrc": [s.path for s in srcs],
        "addDtsClutzAliases": getattr(ctx.attr, "add_dts_clutz_aliases", False),
        "typeCheckDependencies": getattr(ctx.attr, "internal_testing_type_check_dependencies", False),
        "expectedDiagnostics": getattr(ctx.attr, "expected_diagnostics", []),
        "typeCheck": True,
    }

    if getattr(ctx.attr, "use_angular_plugin", False):
        bazel_options["angularCompilerOptions"] = {
            # Needed for back-compat with explicit AOT bootstrap
            # which has imports from generated .ngfactory files
            "generateNgFactoryShims": True,
            # Needed for back-compat with AOT tests which import the
            # .ngsummary files
            "generateNgSummaryShims": True,
            # Bazel expects output files will always be produced
            "allowEmptyCodegenFiles": True,
            "assets": [a.path for a in getattr(ctx.files, "angular_assets", [])],
        }

    if disable_strict_deps:
        bazel_options["disableStrictDeps"] = disable_strict_deps
        bazel_options["allowedStrictDeps"] = []
    else:
        bazel_options["allowedStrictDeps"] = [f.path for f in allowed_deps.to_list()]

    if hasattr(ctx.attr, "module_name") and ctx.attr.module_name:
        bazel_options["moduleName"] = ctx.attr.module_name
    if hasattr(ctx.attr, "module_root") and ctx.attr.module_root:
        bazel_options["moduleRoot"] = ctx.attr.module_root

    if "TYPESCRIPT_WORKER_CACHE_SIZE_MB" in ctx.var:
        max_cache_size_mb = int(ctx.var["TYPESCRIPT_WORKER_CACHE_SIZE_MB"])
        if max_cache_size_mb < 0:
            fail("TYPESCRIPT_WORKER_CACHE_SIZE_MB set to a negative value (%d)." % max_cache_size_mb)
        bazel_options["maxCacheSizeMb"] = max_cache_size_mb

    has_node_runtime = getattr(ctx.attr, "runtime", "browser") == "nodejs"
    target_language_level = "es5" if devmode_manifest or has_node_runtime else "es2015"

    # Keep these options in sync with those in playground/playground.ts.
    # @unsorted-dict-items preserve historical order for golden tests
    compiler_options = {
        # De-sugar to this language level
        "target": target_language_level,

        # The "typescript.es5_sources" provider is expected to work
        # in both nodejs and in browsers, so we use umd in devmode.
        # NOTE: tsc-wrapped will always name the enclosed AMD modules
        # For production mode, we leave the module syntax alone and let the
        # bundler handle it (including dynamic import).
        # Note, in google3 we override this option with "commonjs" since Tsickle
        # will convert that to goog.module syntax.
        "module": "umd" if devmode_manifest or has_node_runtime else "esnext",

        # Has no effect in closure/ES2015 mode. Always true just for simplicity.
        "downlevelIteration": True,

        # Do not type-check the lib.*.d.ts.
        # We think this shouldn't be necessary but haven't figured out why yet
        # and builds are faster with the setting on.
        # See http://b/30709121
        "skipDefaultLibCheck": True,
        "moduleResolution": "node",
        "outDir": "/".join([workspace_path, outdir_path]),

        # We must set a rootDir to avoid TypeScript emit paths varying
        # due computeCommonSourceDirectory behavior.
        # TypeScript requires the rootDir be a parent of all sources in
        # files[], so it must be set to the workspace_path.
        "rootDir": workspace_path,

        # Path handling for resolving modules, see specification at
        # https://github.com/Microsoft/TypeScript/issues/5039
        # Paths where we attempt to load relative references.
        # Longest match wins
        #
        # tsc_wrapped also uses this property to strip leading paths
        # to produce a flattened output tree, see
        # https://github.com/Microsoft/TypeScript/issues/8245
        "rootDirs": ["/".join([workspace_path, e]) for e in extra_root_dirs] + [
            workspace_path,
            "/".join([workspace_path, ctx.configuration.genfiles_dir.path]),
            "/".join([workspace_path, ctx.configuration.bin_dir.path]),
        ],

        # Root for non-relative module names
        "baseUrl": workspace_path,

        # "short name" mappings for npm packages, such as "@angular/core"
        "paths": mapped_module_roots,

        # Inline const enums.
        "preserveConstEnums": False,

        # permit `@Decorator` syntax and allow runtime reflection on their types.
        "experimentalDecorators": True,
        "emitDecoratorMetadata": True,

        # Interpret JSX as React calls (until someone asks for something different)
        "jsx": "react",

        # Truncate excessively long errors.
        # While truncation can make some errors harder to understand, it makes
        # others easier to read. Additionally, for certain errors, TypeScript
        # can run out of memory trying to convert them into a humand readable
        # string (see https://github.com/Microsoft/TypeScript/issues/37230).
        # That's a bug, but the general default configuration of TypeScript is
        # to truncate, so following that seems safer and more in line with the
        # expected developer UX.
        "noErrorTruncation": False,
        # Do not emit files if they had errors (avoid accidentally serving
        # broken code).
        "noEmitOnError": False,
        # Create .d.ts files as part of compilation.
        "declaration": True,

        # We don't support this compiler option (See github #32), so
        # always emit declaration files in the same location as outDir.
        "declarationDir": "/".join([workspace_path, outdir_path]),
        "stripInternal": True,

        # Embed source maps and sources in .js outputs
        "inlineSourceMap": True,
        "inlineSources": True,
        # Implied by inlineSourceMap: True
        "sourceMap": False,
    }

    if hasattr(ctx.attr, "node_modules"):
        compiler_options["typeRoots"] = ["/".join([p for p in [
            workspace_path,
            node_modules_root,
            "@types",
        ] if p])]

    if _DEBUG:
        compiler_options["traceResolution"] = True
        compiler_options["diagnostics"] = True

    # @unsorted-dict-items preserve historical order for golden tests
    return {
        "compilerOptions": compiler_options,
        "bazelOptions": bazel_options,
        "files": [workspace_path + "/" + f.path for f in files],
        "compileOnSave": False,
    }
