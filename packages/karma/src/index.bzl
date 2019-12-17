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

"""Public API surface is re-exported here.
"""

load(
    ":karma_web_test.bzl",
    _karma_web_test = "karma_web_test",
    _karma_web_test_suite = "karma_web_test_suite",
)

karma_web_test = _karma_web_test
karma_web_test_suite = _karma_web_test_suite
# DO NOT ADD MORE rules here unless they appear in the generated docsite.
# Run yarn skydoc to re-generate the docsite.

# TODO(gregmagolan): remove ts_web_test & ts_web_test_suite entirely for 1.0 release
def ts_web_test(**kwargs):
    """This rule has been removed. Replace with karma_web_test"""

    fail("""***********
        
The ts_web_test rule has been removed.

The existing karma_web_test rule with an identical API should be used instead.
It can be loaded from `load("@npm_bazel_karma//:index.bzl", "karma_web_test")`.
************
""")

def ts_web_test_suite(**kwargs):
    """This rule has been removed. Replace with ts_web_test_suite"""

    fail("""***********
        
The ts_web_test_suite rule has been removed.

The existing karma_web_test_suite rule with an identical API should be used instead.
It can be loaded from `load("@npm_bazel_karma//:index.bzl", "karma_web_test_suite")`.
************
""")
