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

"""Example of a rule that requires ES5 (devmode) inputs.
"""

load("@build_bazel_rules_nodejs//internal:node.bzl", "sources_aspect")

def _es5_consumer(ctx):
  files = depset()
  # Since we apply the sources_aspect to our deps below, we can iterate through
  # the deps and grab the attribute attached by that aspect, which is called
  # "node_sources".
  # See https://github.com/bazelbuild/rules_nodejs/blob/master/internal/node.bzl
  for d in ctx.attr.deps:
    files = depset(transitive=[files, d.node_sources])

  return [DefaultInfo(
      files = files,
      runfiles = ctx.runfiles(files.to_list()),
  )]

es5_consumer = rule(
    implementation = _es5_consumer,
    attrs = {
        "deps": attr.label_list(aspects = [sources_aspect])
    }
)
