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

"""Legacy load point for DeclarationInfo
"""

load(
    "//:providers.bzl",
    _DeclarationInfo = "DeclarationInfo",
    _provide_declarations = "provide_declarations",
)

provide_declarations = _provide_declarations
DeclarationInfo = _DeclarationInfo
# TODO: remove this file before 1.0 release
