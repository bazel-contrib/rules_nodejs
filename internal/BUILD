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

package(default_visibility = ["//visibility:public"])

load(":node.bzl", "node_binary")

node_binary(
    name = "tsc_wrapped",
    data = ["@yarn//installed:node_modules"],
    # TODO(alexeagle): plug in tsc_wrapped.js instead
    main = "yarn/installed/node_modules/typescript/lib/tsc.js",
)
