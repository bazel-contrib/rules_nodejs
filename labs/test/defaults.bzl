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
"""A docstring"""

load("//labs:jest_test.bzl", _jest_test = "jest_test")
load("//labs:node_module.bzl", _node_module = "node_module")
load("//labs:tsc.bzl", _tsc = "tsc")

def tsc(srcs = [], declarations = True, sourcemaps = True, **kwargs):
    """A docstring"""

    # Define optional pre-declared output labels
    outs = []
    for src in srcs:
        no_ext = None
        if src.endswith(".ts"):
            no_ext = src[:-3]
        elif src.endswith(".tsx"):
            no_ext = src[:-4]
        if no_ext:
            outs.append(no_ext + ".js")
            if declarations:
                outs.append(no_ext + ".d.ts")
            if sourcemaps:
                outs.append(no_ext + ".js.map")

    deps = kwargs.pop("deps", []) + [
        "@npm//@types/node",
        "@npm//@types/jest",
    ]

    # No sandboxing seems to be an issue on Windows:
    # ```
    # (19:10:14) ERROR: D:/b/bk-windows-java8-7tjp/bazel/rules-nodejs-nodejs/labs/test/tsc/BUILD.bazel:9:1: Couldn't build file labs/test/tsc/index.js: Action labs/test/tsc/index.js failed (Exit 2)
    # --
    #   | error TS5033: Could not write file 'bazel-out/x64_windows-fastbuild/bin/labs/test/tsc/main.d.ts': EPERM: operation not permitted, open 'bazel-out/x64_windows-fastbuild/bin/labs/test/tsc/main.d.ts'.
    #   | error TS5033: Could not write file 'bazel-out/x64_windows-fastbuild/bin/labs/test/tsc/main.js': EPERM: operation not permitted, open 'bazel-out/x64_windows-fastbuild/bin/labs/test/tsc/main.js'.
    #   | error TS5033: Could not write file 'bazel-out/x64_windows-fastbuild/bin/labs/test/tsc/main.js.map': EPERM: operation not permitted, open 'bazel-out/x64_windows-fastbuild/bin/labs/test/tsc/main.js.map'.
    #   | error TS5033: Could not write file 'bazel-out/x64_windows-fastbuild/bin/labs/test/tsc/main.spec.d.ts': EPERM: operation not permitted, open 'bazel-out/x64_windows-fastbuild/bin/labs/test/tsc/main.spec.d.ts'.
    #   | error TS5033: Could not write file 'bazel-out/x64_windows-fastbuild/bin/labs/test/tsc/main.spec.js': EPERM: operation not permitted, open 'bazel-out/x64_windows-fastbuild/bin/labs/test/tsc/main.spec.js'.
    #   | error TS5033: Could not write file 'bazel-out/x64_windows-fastbuild/bin/labs/test/tsc/main.spec.js.map': EPERM: operation not permitted, open 'bazel-out/x64_windows-fastbuild/bin/labs/test/tsc/main.spec.js.map'.
    #   | (19:10:21) FAILED: Build did NOT complete successfully
    # ```
    # Will likely need to generate a tsconfig with strict input files
    tags = kwargs.pop("tags", []) + [
        "fix-windows",
    ]

    _tsc(
        srcs = srcs,
        deps = deps,
        declarations = declarations,
        sourcemaps = sourcemaps,
        outs = outs,
        tsconfig = "//labs/test:tsconfig.json",
        tags = tags,
        **kwargs
    )

def jest_test(**kwargs):
    """A docstring"""

    # Don't run on Windows as tsc deps don't work on Windows
    tags = kwargs.pop("tags", []) + [
        "fix-windows",
    ]

    _jest_test(
        tags = tags,
        **kwargs
    )

def node_module(**kwargs):
    """A docstring"""

    # Don't run on Windows as tsc deps don't work on Windows
    tags = kwargs.pop("tags", []) + [
        "fix-windows",
    ]

    _node_module(
        tags = tags,
        **kwargs
    )
