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

"""Helper functions to preserve legacy `$(rlocation ` usage
"""

def preserve_legacy_rlocation(input):
    """Converts legacy `$(rlocation ` to `$(rlocation ` which is preserved when expanding make
    variables with ctx.expand_make_variables.

    Args:
      input: String to be modified

    Returns:
      The modified string
    """
    result = ""
    length = len(input)
    for i in range(length):
        if input[i:].startswith("$(rlocation "):
            if i == 0 or input[i - 1] != "$":
                # insert an additional "$"
                result += "$"
        result += input[i]
    return result
