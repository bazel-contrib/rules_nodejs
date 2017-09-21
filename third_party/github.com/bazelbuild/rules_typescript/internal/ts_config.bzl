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

"""The ts_config rule allows users to express tsconfig.json file groups.
"""

TsConfig = provider()

def _ts_config_impl(ctx):
  files = depset()
  files += [ctx.file.src]
  return [DefaultInfo(files = files), TsConfig(deps = ctx.files.deps)]

ts_config = rule(
    implementation = _ts_config_impl,
    attrs = {
      "src": attr.label(allow_files = True, single_file = True, mandatory = True),
      "deps": attr.label_list(allow_files = True, mandatory = True),
    },
)
