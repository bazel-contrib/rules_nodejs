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

# From https://github.com/tensorflow/tensorflow/blob/5541ef4fbba56cf8930198373162dd3119e6ee70/tensorflow/workspace.bzl#L44

# Parse the bazel version string from `native.bazel_version`.
# The format is "<major>.<minor>.<patch>-<date> <commit>"
# Returns a 3-tuple of numbers: (<major>, <minor>, <patch>)
def _parse_bazel_version(bazel_version):
  # Remove commit from version.
  version = bazel_version.split(" ", 1)[0]

  # Split into (release, date) parts and only return the release
  # as a tuple of integers.
  parts = version.split("-", 1)
  # Handle format x.x.xrcx
  parts = parts[0].split("rc", 1)

  # Turn "release" into a tuple of numbers
  version_tuple = ()
  for number in parts[0].split("."):
    version_tuple += (int(number),)
  return version_tuple


# Check that a specific bazel version is being used.
# Args: bazel_version in the form "<major>.<minor>.<patch>"
def check_bazel_version(bazel_version):
  if "bazel_version" not in dir(native):
    fail("\nCurrent Bazel version is lower than 0.2.1, expected at least %s\n" %
         bazel_version)
  elif not native.bazel_version:
    print("\nCurrent Bazel is not a release version, cannot check for " +
          "compatibility.")
    print("Make sure that you are running at least Bazel %s.\n" % bazel_version)
  else:
    current_bazel_version = _parse_bazel_version(native.bazel_version)
    minimum_bazel_version = _parse_bazel_version(bazel_version)
    if minimum_bazel_version > current_bazel_version:
      fail("\nCurrent Bazel version is {}, expected at least {}\n".format(
          native.bazel_version, bazel_version))
