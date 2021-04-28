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

"""
# Bazel nodejs Labs

This package contains experimental code which isn't at the same quality or stability standard as our main packages.

By using code in Labs, we trust that you understand:

- It might be deleted at any time
- We offer no support guarantees for using it
- Breaking changes can happen in any release
- We could release with bugs or other brokenness
- Documentation is sparse
"""

load("//packages/labs/grpc_web:ts_proto_library.bzl", _ts_proto_library = "ts_proto_library")

ts_proto_library = _ts_proto_library
