# Copyright 2021 The Bazel Authors. All rights reserved.
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
"""Rules NodeJS Semantics"""

_NODE_TOOLCHAIN_TYPE = Label("//nodejs:toolchain_type")
_NODE_RUNTIME_TOOLCHAIN_TYPE = Label("//nodejs:runtime_toolchain_type")

def _find_node_toolchain(ctx):
    return ctx.toolchains[_NODE_TOOLCHAIN_TYPE].nodeinfo

def _find_node_runtime_toolchain(ctx):
    return ctx.toolchains[_NODE_RUNTIME_TOOLCHAIN_TYPE].nodeinfo

semantics = struct(
    NODE_TOOLCHAIN_LABEL = Label("//nodejs:current_node_toolchain"),
    NODE_TOOLCHAIN_TYPE = _NODE_TOOLCHAIN_TYPE,
    NODE_TOOLCHAIN = config_common.toolchain_type(_NODE_TOOLCHAIN_TYPE, mandatory = True),
    find_node_toolchain = _find_node_toolchain,
    NODE_RUNTIME_TOOLCHAIN_TYPE = _NODE_RUNTIME_TOOLCHAIN_TYPE,
    NODE_RUNTIME_TOOLCHAIN = config_common.toolchain_type(_NODE_RUNTIME_TOOLCHAIN_TYPE, mandatory = True),
    find_node_runtime_toolchain = _find_node_runtime_toolchain,
)
