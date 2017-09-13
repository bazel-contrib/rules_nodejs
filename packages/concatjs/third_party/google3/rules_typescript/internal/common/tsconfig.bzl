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
_DEBUG = False

load(":common/module_mappings.bzl", "get_module_mappings")

def create_tsconfig(ctx, files, srcs,
                    devmode_manifest=None, tsickle_externs=None, type_blacklisted_declarations=[],
                    out_dir=None, disable_strict_deps=False, allowed_deps=depset(),
                    extra_root_dirs=[], module_path_prefixes=None, module_roots=None):
  """Creates an object representing the TypeScript configuration
      to run the compiler under Bazel.

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
  """
  outdir_path = out_dir if out_dir != None else ctx.configuration.bin_dir.path
  # Callers can choose the filename for the tsconfig, but it must always live
  # in the output directory corresponding with the label where it's declared.
  tsconfig_dir = "/".join([p
      for p in [
          ctx.bin_dir.path,
          ctx.label.workspace_root,
          ctx.label.package
      ] + ctx.label.name.split("/")[:-1]
      # Skip empty path segments (eg. workspace_root when in same repo)
      if p])
  workspace_path = "/".join([".."] * len(tsconfig_dir.split("/")))
  if module_path_prefixes == None:
    module_path_prefixes = [
        "",
        ctx.configuration.genfiles_dir.path + "/",
        ctx.configuration.bin_dir.path + "/"
    ]
  if module_roots == None:
    base_path_mappings = ["%s/*" % p for p in [
        ".",
        ctx.configuration.genfiles_dir.path,
        ctx.configuration.bin_dir.path
    ]]
    module_roots = {
        "*": base_path_mappings,
    }
  module_mappings = get_module_mappings(ctx.label, ctx.attr, srcs = srcs)

  for name, path in module_mappings.items():
    # Each module name maps to the immediate path, to resolve "index(.d).ts",
    # or module mappings that directly point to files (like index.d.ts).
    module_roots[name] = ["%s%s" % (p, path.replace(".d.ts", "")) for p in module_path_prefixes]
    if not path.endswith(".d.ts"):
      # If not just mapping to a single .d.ts file, include a path glob that
      # maps the entire module root.
      module_roots["{}/*".format(name)] = ["%s%s/*" % (p, path) for p in module_path_prefixes]

  # Options for running the TypeScript compiler under Bazel.
  # See javascript/typescript/compiler/tsc_wrapped.ts:BazelOptions.
  # Unlike compiler_options, the paths here are relative to the rootDir,
  # not the location of the tsconfig.json file.
  bazel_options = {
      "workspaceName": ctx.workspace_name,
      "target": str(ctx.label),
      "tsickle": tsickle_externs != None,
      "tsickleGenerateExterns": getattr(ctx.attr, "generate_externs", True),
      "tsickleExternsPath": tsickle_externs.path if tsickle_externs else "",
      "untyped": not getattr(ctx.attr, "tsickle_typed", False),
      "typeBlackListPaths": [f.path for f in type_blacklisted_declarations],

      "es5Mode": devmode_manifest != None,
      "manifest": devmode_manifest if devmode_manifest else "",
      # Explicitly tell the compiler which sources we're interested in (emitting
      # and type checking).
      "compilationTargetSrc": [s.path for s in srcs],
      "disableStrictDeps": disable_strict_deps,
      "allowedStrictDeps": [f.path for f in allowed_deps],
      "enableConformance": getattr(ctx.attr, "enable_conformance", False),
  }

  # Keep these options in sync with those in playground/playground.ts.
  compiler_options = {
      # De-sugar to this language level
      "target": "es5" if devmode_manifest or ctx.attr.runtime == "nodejs" else "es6",
      # Has no effect in closure/ES2015 mode. Always true just for simplicity.
      "downlevelIteration": True,

      # Do not type-check the lib.*.d.ts.
      # We think this shouldn't be necessary but haven't figured out why yet
      # and builds are faster with the setting on.
      "skipDefaultLibCheck": True,

      # Always produce commonjs modules (might get translated to goog.module).
      "module": "commonjs",
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
      "paths": module_roots,

      # Inline const enums.
      "preserveConstEnums": False,

      # permit `@Decorator` syntax and allow runtime reflection on their types.
      "experimentalDecorators": True,
      "emitDecoratorMetadata": True,

      # Interpret JSX as React calls (until someone asks for something different)
      "jsx": "react",
      "jsxFactory": "React.createElement",

      "noEmitOnError": False,
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

  if _DEBUG:
    compiler_options["traceResolution"] = True
    compiler_options["diagnostics"] = True

  return {
    "compilerOptions": compiler_options,
    "bazelOptions": bazel_options,
    "files": [workspace_path + "/" + f.path for f in files],
    "compileOnSave": False,
  }
