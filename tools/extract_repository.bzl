# Copyright 2018 The Bazel Authors. All rights reserved.
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

"""Custom extract_repository rule used by npm_install and yarn_install.
"""

load("@build_bazel_rules_nodejs//internal/common:os_name.bzl", "os_name")

def _copy_file(rctx, src):
    src_path = rctx.path(src)
    rctx.template(src_path.basename, src_path)

def _extract_repository_impl(rctx):
    is_windows = os_name(rctx).find("windows") != -1
    if is_windows:
        _copy_file(rctx, Label("@build_bazel_rules_nodejs//tools:_extract.ps1"))
        result = rctx.execute(["powershell", "-file", "_extract.ps1", rctx.path(rctx.attr.archive), ".", rctx.attr.strip_prefix])
    else:
        _copy_file(rctx, Label("@build_bazel_rules_nodejs//tools:_extract.sh"))
        result = rctx.execute(["./_extract.sh", rctx.path(rctx.attr.archive), ".", rctx.attr.strip_prefix])
    if result.return_code:
        fail("extract_repository failed: \nSTDOUT:\n%s\nSTDERR:\n%s" % (result.stdout, result.stderr))

extract_repository = repository_rule(
    implementation = _extract_repository_impl,
    attrs = {
        "archive": attr.label(allow_single_file = True),
        "strip_prefix": attr.string(),
    },
)
