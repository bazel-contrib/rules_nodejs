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

"Defaults for rules_karma repository not meant to be used downstream"

load(
    "@npm_bazel_karma//:defs.bzl",
    _karma_web_test = "karma_web_test",
    _karma_web_test_suite = "karma_web_test_suite",
    _ts_web_test = "ts_web_test",
    _ts_web_test_suite = "ts_web_test_suite",
)

INTERNAL_KARMA_BIN = "@npm_bazel_karma//:karma_bin"

def karma_web_test(karma = INTERNAL_KARMA_BIN, **kwargs):
    _karma_web_test(karma = karma, **kwargs)

def karma_web_test_suite(karma = INTERNAL_KARMA_BIN, **kwargs):
    _karma_web_test_suite(karma = karma, **kwargs)

def ts_web_test(karma = INTERNAL_KARMA_BIN, **kwargs):
    _ts_web_test(karma = karma, **kwargs)

def ts_web_test_suite(karma = INTERNAL_KARMA_BIN, **kwargs):
    _ts_web_test_suite(karma = karma, **kwargs)
