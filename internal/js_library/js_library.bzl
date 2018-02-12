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

"""js_library allows defining a set of javascript sources and assigning a module_name and module_root.

DO NOT USE - this is not fully designed, and exists only to enable testing within this repo.
"""

def _js_library(ctx):
  return DefaultInfo(files=depset(ctx.files.srcs))

js_library = rule(
    implementation = _js_library,
    attrs = {
        "srcs": attr.label_list(allow_files = [".js"]),
        # Used to determine module mappings
        "module_name": attr.string(),
        "module_root": attr.string(),
    },
)
