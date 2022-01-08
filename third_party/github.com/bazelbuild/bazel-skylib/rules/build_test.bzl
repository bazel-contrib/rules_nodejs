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

"""A test verifying other targets build as part of a `bazel test`"""

load("//third_party/github.com/bazelbuild/bazel-skylib:lib/new_sets.bzl", "sets")

def _empty_test_impl(ctx):
    extension = ".bat" if ctx.attr.is_windows else ".sh"
    content = "exit 0" if ctx.attr.is_windows else "#!/usr/bin/env bash\nexit 0"
    executable = ctx.actions.declare_file(ctx.label.name + extension)
    ctx.actions.write(
        output = executable,
        is_executable = True,
        content = content,
    )

    return [DefaultInfo(
        files = depset([executable]),
        executable = executable,
        runfiles = ctx.runfiles(files = ctx.files.data),
    )]

_empty_test = rule(
    implementation = _empty_test_impl,
    attrs = {
        "data": attr.label_list(allow_files = True),
        "is_windows": attr.bool(mandatory = True),
    },
    test = True,
)

def build_test(name, targets, **kwargs):
    """Test rule checking that other targets build.

    This works not by an instance of this test failing, but instead by
    the targets it depends on failing to build, and hence failing
    the attempt to run this test.

    Typical usage:

    ```
      load("@bazel_skylib//rules:build_test.bzl", "build_test")
      build_test(
          name = "my_build_test",
          targets = [
              "//some/package:rule",
          ],
      )
    ```

    Args:
      name: The name of the test rule.
      targets: A list of targets to ensure build.
      **kwargs: The <a href="https://docs.bazel.build/versions/main/be/common-definitions.html#common-attributes-tests">common attributes for tests</a>.
    """
    if len(targets) == 0:
        fail("targets must be non-empty", "targets")
    if kwargs.get("data", None):
        fail("data is not supported on a build_test()", "data")

    # Remove any duplicate test targets.
    targets = sets.to_list(sets.make(targets))

    # Use a genrule to ensure the targets are built (works because it forces
    # the outputs of the other rules on as data for the genrule)

    # Split into batches to hopefully avoid things becoming so large they are
    # too much for a remote execution set up.
    batch_size = max(1, len(targets) // 100)

    # Pull a few args over from the test to the genrule.
    args_to_reuse = ["compatible_with", "restricted_to", "tags"]
    genrule_args = {k: kwargs.get(k) for k in args_to_reuse if k in kwargs}

    # Pass an output from the genrules as data to a shell test to bundle
    # it all up in a test.
    test_data = []

    for idx, batch in enumerate([targets[i:i + batch_size] for i in range(0, len(targets), batch_size)]):
        full_name = "{name}_{idx}__deps".format(name = name, idx = idx)
        test_data.append(full_name)
        native.genrule(
            name = full_name,
            srcs = batch,
            outs = [full_name + ".out"],
            testonly = 1,
            visibility = ["//visibility:private"],
            cmd = "touch $@",
            cmd_bat = "type nul > $@",
            **genrule_args
        )

    _empty_test(
        name = name,
        data = test_data,
        size = kwargs.pop("size", "small"),  # Default to small for test size
        is_windows = select({
            "@bazel_tools//src/conditions:host_windows": True,
            "//conditions:default": False,
        }),
        **kwargs
    )
