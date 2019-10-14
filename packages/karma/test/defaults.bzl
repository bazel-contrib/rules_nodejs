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

"""Overrides for ts_web_test_suite to support bazelci testing
"""

load("@npm_bazel_karma//:index.from_src.bzl", _ts_web_test_suite = "ts_web_test_suite")

def ts_web_test_suite(name, browsers = [], tags = [], **kwargs):
    # BazelCI docker images are missing shares libs to run a subset browser tests:
    # mac: firefox does not work, chrome works
    # ubuntu: firefox and chrome do not work --- there are 0 tests to run
    # windows: firefox (disabled by rules_webtesting) and chrome do not work --- there are 0 tests to run
    # TODO(gregmagolan): fix underlying issue in bazelci and remove this macro

    # For CircleCI and local testing
    _ts_web_test_suite(
        name = name,
        tags = tags + ["no-bazelci"],
        browsers = browsers,
        **kwargs
    )

    # For BazelCI mac only
    _ts_web_test_suite(
        name = "bazelci_chrome_" + name,
        tags = tags + ["no-circleci", "no-bazelci-ubuntu", "no-bazelci-windows", "no-local"],
        browsers = [
            "@io_bazel_rules_webtesting//browsers:chromium-local",
        ],
        **kwargs
    )
