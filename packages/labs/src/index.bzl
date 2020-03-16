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

"""Public API surface is re-exported here.
"""

load("@npm_bazel_labs//grpc_web:ts_proto_library.bzl", _ts_proto_library = "ts_proto_library")
load("@npm_bazel_labs//protobufjs:ts_proto_library.bzl", _protobufjs_ts_library = "ts_proto_library")

ts_proto_library = _ts_proto_library
protobufjs_ts_library = _protobufjs_ts_library
