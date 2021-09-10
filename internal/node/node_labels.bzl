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

"""Helper functions to get node and npm labels in @nodejs repository.

Labels are different on windows and linux/OSX.
"""

load("//nodejs/private:os_name.bzl", "is_windows_os", "os_name")

def get_node_label(rctx):
    if is_windows_os(rctx):
        return Label("@nodejs_%s//:bin/node.cmd" % os_name(rctx))
    return Label("@nodejs_%s//:bin/node" % os_name(rctx))

def get_npm_label(rctx):
    if is_windows_os(rctx):
        return Label("@nodejs_%s//:bin/npm.cmd" % os_name(rctx))
    return Label("@nodejs_%s//:bin/npm" % os_name(rctx))

def get_npm_node_repositories_label(rctx):
    if is_windows_os(rctx):
        return Label("@nodejs_%s//:bin/npm_node_repositories.cmd" % os_name(rctx))
    return Label("@nodejs_%s//:bin/npm_node_repositories" % os_name(rctx))

def get_yarn_label(rctx):
    if is_windows_os(rctx):
        return Label("@nodejs_%s//:bin/yarn.cmd" % os_name(rctx))
    return Label("@nodejs_%s//:bin/yarn" % os_name(rctx))
