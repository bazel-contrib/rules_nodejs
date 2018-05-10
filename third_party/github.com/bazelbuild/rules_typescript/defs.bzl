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
load("//internal:ts_repositories.bzl", _ts_setup_workspace = "ts_setup_workspace")
load("//internal:build_defs.bzl", _ts_library = "ts_library")
load("//internal:ts_config.bzl", _ts_config = "ts_config")
load("//internal/devserver:ts_devserver.bzl", _ts_devserver = "ts_devserver_macro")
load("//internal/karma:ts_web_test.bzl",
     _ts_web_test = "ts_web_test_macro",
     _ts_web_test_suite = "ts_web_test_suite")
load("//internal/protobufjs:ts_proto_library.bzl", _ts_proto_library = "ts_proto_library")

ts_setup_workspace = _ts_setup_workspace
ts_library = _ts_library
ts_config = _ts_config
ts_devserver = _ts_devserver
# TODO(alexeagle): make ts_web_test && ts_web_test_suite work in google3
ts_web_test = _ts_web_test
ts_web_test_suite = _ts_web_test_suite
ts_proto_library = _ts_proto_library
# DO NOT ADD MORE rules here unless they appear in the generated docsite.
# Run yarn skydoc to re-generate the docsite.
