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

load("//packages/typescript/internal:build_defs.bzl", _ts_library = "ts_library")
load("//packages/typescript/internal:ts_config.bzl", _ts_config = "ts_config")
load("//packages/typescript/internal:ts_project.bzl", _ts_project = "ts_project_macro")
load("//packages/typescript/internal:ts_repositories.bzl", _ts_setup_workspace = "ts_setup_workspace")
load("//packages/typescript/internal/devserver:ts_devserver.bzl", _ts_devserver = "ts_devserver")

ts_setup_workspace = _ts_setup_workspace
ts_library = _ts_library
ts_config = _ts_config
ts_project = _ts_project
ts_devserver = _ts_devserver
# DO NOT ADD MORE rules here unless they appear in the generated docsite.
# Run yarn stardoc to re-generate the docsite.
