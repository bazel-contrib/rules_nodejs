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

"""Helper function for repository rules
"""

OS_ARCH_NAMES = [
    ("darwin", "amd64"),
    ("windows", "amd64"),
    ("linux", "amd64"),
]

OS_NAMES = ["_".join(os_arch_name) for os_arch_name in OS_ARCH_NAMES]

def os_name(repository_ctx):
    """Get the os name for a repository rule

    Args:
      repository_ctx: The repository rule context

    Returns:
      A string describing the os for a repository rule
    """
    os_name = repository_ctx.os.name.lower()
    if os_name.startswith("mac os"):
        return OS_NAMES[0]
    elif os_name.find("windows") != -1:
        return OS_NAMES[1]
    elif os_name.startswith("linux"):
        return OS_NAMES[2]
    else:
        fail("Unsupported operating system: " + os_name)
