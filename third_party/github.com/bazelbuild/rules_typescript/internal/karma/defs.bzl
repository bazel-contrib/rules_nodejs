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

""" Public API surface is re-exported here.
"""

load(
    ":karma_web_test.bzl",
    _karma_web_test = "karma_web_test",
    _karma_web_test_suite = "karma_web_test_suite",
)
load(
    ":ts_web_test.bzl",
    _ts_web_test = "ts_web_test",
    _ts_web_test_suite = "ts_web_test_suite",
)

# TODO(alexeagle): make ts_web_test && ts_web_test_suite work in google3
ts_web_test = _ts_web_test
ts_web_test_suite = _ts_web_test_suite
karma_web_test = _karma_web_test
karma_web_test_suite = _karma_web_test_suite
