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

"""A mock typescript_lib rule.

Allows testing that node_jasmine_test will work with ts_library from
rules_typescript without introducing a circular dependency.
"""

def _mock_typescript_lib(ctx):
  es5_sources = depset()
  for s in ctx.attr.srcs:
    es5_sources = depset(transitive=[es5_sources, s.files])
  return struct(typescript = struct(es5_sources = es5_sources))

mock_typescript_lib = rule(
  implementation = _mock_typescript_lib,
  attrs = {
    "srcs": attr.label_list(allow_files = True),
  }
)
