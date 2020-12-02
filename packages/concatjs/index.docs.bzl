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

"""This contains references to the symbols we want documented.

We can't point stardoc to the top-level index.bzl since then it will see macros rather than the rules they wrap.
So this is a copy of index.bzl with macro indirection removed.
"""

load("//packages/concatjs/devserver:concatjs_devserver.bzl", _concatjs_devserver = "concatjs_devserver")
load(
    "//packages/concatjs/web_test:karma_web_test.bzl",
    _karma_web_test = "karma_web_test",
    _karma_web_test_suite = "karma_web_test_suite",
)

karma_web_test = _karma_web_test
karma_web_test_suite = _karma_web_test_suite
concatjs_devserver = _concatjs_devserver
# DO NOT ADD MORE rules here unless they appear in the generated docsite.
# Run yarn stardoc to re-generate the docsite.
