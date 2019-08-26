# Copyright 2018 The Bazel Authors. All rights reserved.
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

"""Pinned browser versions tested against in https://github.com/bazelbuild/rules_typescript CI.
"""

load("@io_bazel_rules_webtesting//web/versioned:browsers-0.3.2.bzl", _browser_repositories = "browser_repositories")

def browser_repositories():
    print("""
    WARNING: @npm_bazel_karma//:browser_repositories.bzl is deprecated.
    replace this with @io_bazel_rules_webtesting//web/versioned:browsers-0.3.2.bzl
    and choose some specific browsers to test on (eg. chromium=True)

    """)
    _browser_repositories(chromium = True, firefox = True)
