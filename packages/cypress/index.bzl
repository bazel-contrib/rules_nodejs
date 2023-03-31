# Copyright 2020 The Bazel Authors. All rights reserved.
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
# Cypress rules for Bazel

The Cypress rules run tests under the Cypress e2e testing framework with Bazel.

## Installation

Add `@bazel/cypress` and `cypress` npm packages to your `devDependencies` in `package.json`.

```
npm install --save-dev @bazel/cypress cypress
```
or using yarn
```
yarn add -D @bazel/cypress cypress
```

Then, load and invoke `cypress_repositories` within your `WORKSPACE` file.

```python
load("@build_bazel_rules_nodejs//toolchains/cypress:cypress_repositories.bzl", "cypress_repositories")

# The name you pass here names the external repository you can load cypress_web_test from
cypress_repositories(name = "cypress", version = "MATCH_VERSION_IN_PACKAGE_JSON")
```

"""

load(
    "@build_bazel_rules_nodejs//toolchains/cypress:cypress_repositories.bzl",
    _cypress_repositories = "cypress_repositories",
)
load(
    "@build_bazel_rules_nodejs//packages/cypress/internal:cypress_web_test.bzl",
    _cypress_web_test = "cypress_web_test",
)
load(
    "@build_bazel_rules_nodejs//toolchains/cypress:cypress_toolchain.bzl",
    _cypress_toolchain = "cypress_toolchain",
)

cypress_repositories = _cypress_repositories
cypress_web_test = _cypress_web_test
cypress_toolchain = _cypress_toolchain
