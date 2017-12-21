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

"""Example of a rule that requires ES6 inputs.
"""

load("@build_bazel_rules_nodejs//:internal/collect_es6_sources.bzl", "collect_es6_sources")

def _es6_consumer(ctx):
  es6_sources = collect_es6_sources(ctx)

  return [DefaultInfo(
      files = es6_sources,
      runfiles = ctx.runfiles(es6_sources.to_list()),
  )]

es6_consumer = rule(
    implementation = _es6_consumer,
    attrs = {
        "deps": attr.label_list(),
    }
)
