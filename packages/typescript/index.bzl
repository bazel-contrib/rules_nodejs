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

Users should not load files under "/internal"
"""

load("@build_bazel_rules_nodejs//:defs.bzl", "COMMON_REPLACEMENTS")
load("//:version.bzl", _check_rules_typescript_version = "check_rules_typescript_version")
load("//internal:build_defs.bzl", _ts_library = "ts_library_macro")
load("//internal:ts_config.bzl", _ts_config = "ts_config")
load("//internal:ts_repositories.bzl", _ts_setup_workspace = "ts_setup_workspace")
load("//internal/devserver:ts_devserver.bzl", _ts_devserver = "ts_devserver_macro")
load("//internal/protobufjs:ts_proto_library.bzl", _ts_proto_library = "ts_proto_library")

check_rules_typescript_version = _check_rules_typescript_version
ts_setup_workspace = _ts_setup_workspace
ts_library = _ts_library
ts_config = _ts_config
ts_devserver = _ts_devserver

ts_proto_library = _ts_proto_library
# DO NOT ADD MORE rules here unless they appear in the generated docsite.
# Run bazel build :generate_README to re-generate the docsite.

TYPESCRIPT_REPLACEMENTS = dict(
    COMMON_REPLACEMENTS,
    **{
        # This BEGIN-DEV fencing is required as files pulled in from
        # @build_bazel_rules_typescript//:npm_bazel_typescript_package
        # use this alternate fencing
        "(#|\/\/)\\s+BEGIN-DEV-ONLY[\\w\W]+?(#|\/\/)\\s+END-DEV-ONLY": "",
        # Do a simple replacement needed to make the local development differ
        # from how our release is used.
        "//devserver:devserver_bin": "//devserver",
        # This file gets vendored into our repo
        "@build_bazel_rules_typescript//internal:common": "//internal:common",
    }
)
