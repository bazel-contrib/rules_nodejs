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

""" Defaults for usage without @npm//@bazel/stylus
"""

load(
    ":index.bzl",
    _stylus_binary = "stylus_binary",
)

def stylus_binary(**kwargs):
    _stylus_binary(
        # Override to point to the one installed by build_bazel_rules_nodejs in the root
        compiler = "@npm//stylus/bin:stylus",
        **kwargs
    )
