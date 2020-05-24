# Copyright 2020 The Bazel Authors. All rights reserved.
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

"""This module contains a provider for assets needed for bundling"""

AssetInfo = provider(
    doc = """The AssetInfo provider allows rules to associate build targets with
assets to be consumed by downstream bundling targets such as webpack or rollup.
""",
    fields = {
        "assets": """Asset files provided by this rule and all its transitive dependencies.
This prevents needing an aspect in rules that consume the typings, which improves performance.""",
    },
)
