---
title: Home
layout: default
toc: true
---

# Stamping

Bazel is generally only a build tool, and is unaware of your version control system.
However, when publishing releases, you typically want to embed version information in the resulting distribution.
Bazel supports this natively, using the following approach:

To stamp a build, you must pass the `--stamp` argument to Bazel.

> Previous releases of rules_nodejs stamped builds always.
> However this caused stamp-aware actions to never be remotely cached, since the volatile
> status file is passed as an input and its checksum always changes.

Also pass the `workspace_status_command` argument to `bazel build`.
We prefer to do these with an entry in `.bazelrc`:

```sh
# This tells Bazel how to interact with the version control system
# Enable this with --config=release
build:release --stamp --workspace_status_command=./tools/bazel_stamp_vars.sh
```

Then create `tools/bazel_stamp_vars.sh`.

This is a script that prints variable/value pairs.
Make sure you set the executable bit, eg. `chmod 755 tools/bazel_stamp_vars.sh`.
For example, we could run `git describe` to get the current tag:

```bash
#!/usr/bin/env bash
echo BUILD_SCM_VERSION $(git describe --abbrev=7 --tags HEAD)
```

For a more full-featured script, take a look at the [bazel_stamp_vars in Angular]

Finally, we recommend a release script around Bazel. We typically have more than one npm package published from one Bazel workspace, so we do a `bazel query` to find them, and publish in a loop. Here is a template to get you started:

```sh
#!/usr/bin/env bash

set -u -e -o pipefail

# Call the script with argument "pack" or "publish"
readonly NPM_COMMAND=${1:-publish}
# Don't rely on $PATH to have the right version
readonly BAZEL_BIN=./node_modules/.bin/bazel
# Use a new output_base so we get a clean build
# Bazel can't know if the git metadata changed
readonly TMP=$(mktemp -d -t bazel-release.XXXXXXX)
readonly BAZEL="$BAZEL_BIN --output_base=$TMP"
# Find all the npm packages in the repo
readonly PKG_NPM_LABELS=`$BAZEL query --output=label 'kind("pkg_npm", //...)'`
# Build them in one command to maximize parallelism
$BAZEL build --config=release $PKG_NPM_LABELS
# publish one package at a time to make it easier to spot any errors or warnings
for pkg in $PKG_NPM_LABELS ; do
  $BAZEL run --config=release -- ${pkg}.${NPM_COMMAND} --access public --tag latest
done
```

> WARNING: Bazel can't track changes to git tags. That means it won't rebuild a target if only the result of the workspace_status_command has changed. So changes to the version information may not be reflected if you re-build the package or bundle, and nothing in the package or bundle has changed.

See https://www.kchodorow.com/blog/2017/03/27/stamping-your-builds/ for more background.

[bazel_stamp_vars in Angular]: https://github.com/angular/angular/blob/master/tools/bazel_stamp_vars.sh
