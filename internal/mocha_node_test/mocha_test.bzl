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

"""NodeJS testing

These rules let you run NodeJS tests using the mocha test runner.
"""

load("//internal/node:node.bzl", "nodejs_test")

def mocha_node_test(
    name,
    srcs = [],
    data = [],
    deps = [],
    mocha_args = [],
    mocha_opts = None,
    **kwargs
):
    """Runs mocha.
    
    Args:
        name: Name of the resulting label
        srcs: JavaScript source files containing Mocha specs
        data: Runtime dependencies which will be loaded while the test executes
        deps: Other targets which produce JavaScript, such as ts_library
        mocha_args: Optional arguments to pass to mocha.
        mocha_opts: Optional label for a mocha.opts configuration file 
        **kwargs: remaining arguments are passed to the test rule
    """
    # Prepare all data files
    all_data = [] + srcs + deps + data

    # Add mocha, source-map-support as deps.
    all_data += [Label("@bazel_tools//tools/bash/runfiles")]

    # Prep our args
    templated_args = [] + mocha_args

    # Add the mocha opts file, if provided
    if mocha_opts != None:
        all_data.append(mocha_opts)
        templated_args.append("--opts")
        templated_args.append("$(location {})".format(mocha_opts))

    # Expand the given test sources, and add them as arguments
    for _, d in enumerate(srcs):
        templated_args.append("../$(location {})".format(d))

    # Run a nodejs test
    nodejs_test(
        name = name,
        data = all_data,
        entry_point = "mocha/bin/mocha",
        templated_args = templated_args,
        expected_exit_code = 0,
        **kwargs
    )
 