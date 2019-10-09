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

"""Private API surfaced for https://github.com/bazelbuild/rules_typescript backward-compatability

Users should not load files under "/internal"

NOTE: This file is DEPRECATED and will be removed in a future release.
"""

load(
    "//internal/common:expand_into_runfiles.bzl",
    _expand_location_into_runfiles = "expand_location_into_runfiles",
)

expand_location_into_runfiles = _expand_location_into_runfiles
