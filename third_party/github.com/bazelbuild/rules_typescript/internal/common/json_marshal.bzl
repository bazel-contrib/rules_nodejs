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

"""Marshal an arbitrary Starlark object to JSON."""

def json_marshal(data):
    """Serializes arbitrary data to JSON.

    Args:
      data: any object

    Returns:
      JSON string representing the data
    """
    if type(data) == "dict" or type(data) == "list":
        return str(data).replace(": True", ": true").replace(": False", ": false").replace(": None", ": false")
    elif type(data) == "int":
        return str(data)
    elif type(data) == "string":
        return "\"" + data + "\""
    elif type(data) == "Label":
        return "\"//{}:{}\"".format(data.package, data.name)
    elif type(data) == "bool":
        return "true" if data else "false"
    return "unknown type {}: {}".format(type(data), data)
