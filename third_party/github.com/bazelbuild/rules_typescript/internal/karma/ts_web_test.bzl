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
"Unit testing in with Karma"

load("@build_bazel_rules_nodejs//internal:node.bzl",
    "sources_aspect",
    "expand_path_into_runfiles",
)
load("@build_bazel_rules_nodejs//internal/js_library:js_library.bzl", "write_amd_names_shim")
load("@io_bazel_rules_webtesting//web:web.bzl", "web_test_suite")
load("@io_bazel_rules_webtesting//web/internal:constants.bzl", "DEFAULT_WRAPPED_TEST_TAGS")

_CONF_TMPL = "//internal/karma:karma.conf.js"

def _ts_web_test_impl(ctx):
  conf = ctx.actions.declare_file(
      "%s.conf.js" % ctx.label.name,
      sibling=ctx.outputs.executable)

  files = depset(ctx.files.srcs)
  for d in ctx.attr.deps:
    if hasattr(d, "node_sources"):
      files += d.node_sources
    elif hasattr(d, "files"):
      files += d.files

  # The files in the bootstrap attribute come before the require.js support.
  # Note that due to frameworks = ['jasmine'], a few scripts will come before
  # the bootstrap entries:
  # build_bazel_rules_typescript_karma_deps/node_modules/jasmine-core/lib/jasmine-core/jasmine.js
  # build_bazel_rules_typescript_karma_deps/node_modules/karma-jasmine/lib/boot.js
  # build_bazel_rules_typescript_karma_deps/node_modules/karma-jasmine/lib/adapter.js
  # This is desired so that the bootstrap entries can patch jasmine, as zone.js does.
  bootstrap_entries = [
      expand_path_into_runfiles(ctx, f.short_path)
      for f in ctx.files.bootstrap
  ]

  amd_names_shim = ctx.actions.declare_file(
      "_%s.amd_names_shim.js" % ctx.label.name,
      sibling = ctx.outputs.executable)
  write_amd_names_shim(ctx.actions, amd_names_shim, ctx.attr.bootstrap)

  # Explicitly list the requirejs library files here, rather than use
  # `frameworks: ['requirejs']`
  # so that we control the script order, and the bootstrap files come before
  # require.js.
  # That allows bootstrap files to have anonymous AMD modules, or to do some
  # polyfilling before test libraries load.
  # See https://github.com/karma-runner/karma/issues/699
  bootstrap_entries += [
    "build_bazel_rules_typescript_karma_deps/node_modules/requirejs/require.js",
    "build_bazel_rules_typescript_karma_deps/node_modules/karma-requirejs/lib/adapter.js",
    "/".join([ctx.workspace_name, amd_names_shim.short_path]),
  ]
  # Finally we load the user's srcs and deps
  user_entries = [
      expand_path_into_runfiles(ctx, f.short_path)
      for f in files
  ]
  static_files = [
      expand_path_into_runfiles(ctx, f.short_path)
      for f in ctx.files.static_files
  ]

  # root-relative (runfiles) path to the directory containing karma.conf
  config_segments = len(conf.short_path.split("/"))

  ctx.actions.expand_template(
      output = conf,
      template =  ctx.file._conf_tmpl,
      substitutions = {
          "TMPL_runfiles_path": "/".join([".."] * config_segments),
          "TMPL_bootstrap_files": "\n".join(["      '%s'," % e for e in bootstrap_entries]),
          "TMPL_user_files": "\n".join(["      '%s'," % e for e in user_entries]),
          "TMPL_static_files": "\n".join(["      '%s'," % e for e in static_files]),
          "TMPL_workspace_name": ctx.workspace_name,
      })

  karma_executable_path = ctx.executable._karma.short_path
  if karma_executable_path.startswith('..'):
    karma_executable_path = "external" + karma_executable_path[2:]

  karma_runfiles = [
    conf,
    amd_names_shim,
  ]
  karma_runfiles += ctx.files.srcs
  karma_runfiles += ctx.files.deps
  karma_runfiles += ctx.files.bootstrap
  karma_runfiles += ctx.files.static_files

  ctx.actions.write(
      output = ctx.outputs.executable,
      is_executable = True,
      content = """#!/usr/bin/env bash
MANIFEST="$TEST_SRCDIR/MANIFEST"
if [ -e "$MANIFEST" ]; then
  while read line; do
    declare -a PARTS=($line)
    if [ "${{PARTS[0]}}" == "build_bazel_rules_typescript/{TMPL_karma}" ]; then
      readonly KARMA=${{PARTS[1]}}
    elif [ "${{PARTS[0]}}" == "build_bazel_rules_typescript/{TMPL_conf}" ]; then
      readonly CONF=${{PARTS[1]}}
    fi
  done < $MANIFEST
else
  readonly KARMA={TMPL_karma}
  readonly CONF={TMPL_conf}
fi

export HOME=$(mktemp -d)
ARGV=( "start" $CONF )

# Detect that we are running as a test, by using a well-known environment
# variable. See go/test-encyclopedia
if [ ! -z "$TEST_TMPDIR" ]; then
  ARGV+=( "--single-run" )
fi

$KARMA ${{ARGV[@]}}
""".format(TMPL_karma = karma_executable_path,
           TMPL_conf = conf.short_path))
  return [DefaultInfo(
      files = depset([ctx.outputs.executable]),
      runfiles = ctx.runfiles(
          files = karma_runfiles,
          transitive_files = files,
          # Propagate karma_bin and its runfiles
          collect_data = True,
          collect_default = True,
      ),
      executable = ctx.outputs.executable,
  )]

ts_web_test = rule(
    implementation = _ts_web_test_impl,
    test = True,
    executable = True,
    attrs = {
        "srcs": attr.label_list(
            doc = "JavaScript source files",
            allow_files = [".js"]),
        "deps": attr.label_list(
            doc = "Other targets which produce JavaScript such as `ts_library`",
            allow_files = True,
            aspects = [sources_aspect],
        ),
        "bootstrap": attr.label_list(
            doc = """JavaScript files to include *before* the module loader (require.js).
            For example, you can include Reflect,js for TypeScript decorator metadata reflection,
            or UMD bundles for third-party libraries.""",
            allow_files = [".js"],
        ),
        "data": attr.label_list(
            doc = "Runtime dependencies",
            cfg = "data"),
        "static_files": attr.label_list(
            doc = """Arbitrary files which to be served.""",
            allow_files = True),
        "_karma": attr.label(
            default = Label("//internal/karma:karma_bin"),
            executable = True,
            cfg = "data",
            single_file = False,
            allow_files = True),
        "_conf_tmpl": attr.label(
            default = Label(_CONF_TMPL),
            allow_files = True, single_file = True),
    },
)
"""Runs unit tests in a browser.

When executed under `bazel test`, this uses a headless browser for speed.
This is also because `bazel test` allows multiple targets to be tested together,
and we don't want to open a Chrome window on your machine for each one. Also,
under `bazel test` the test will execute and immediately terminate.

Running under `ibazel test` gives you a "watch mode" for your tests. The rule is
optimized for this case - the test runner server will stay running and just
re-serve the up-to-date JavaScript source bundle.

To debug a single test target, run it with `bazel run` instead. This will open a
browser window on your computer. Also you can use any other browser by opening
the URL printed when the test starts up. The test will remain running until you
cancel the `bazel run` command.

Currently this rule uses Karma as the test runner, but this is an implementation
detail. We might switch to another runner like Jest in the future.
"""

# This macro exists only to modify the users rule definition a bit.
# DO NOT add composition of additional rules here.
def ts_web_test_macro(tags = [], data = [], **kwargs):
  """ibazel wrapper for `ts_web_test`

  This macro re-exposes the `ts_web_test` rule with some extra tags so that
  it behaves correctly under ibazel.

  This is re-exported in `//:defs.bzl` as `ts_web_test` so if you load the rule
  from there, you actually get this macro.

  Args:
    tags: standard Bazel tags, this macro adds a couple for ibazel
    data: runtime dependencies
    **kwargs: passed through to `ts_web_test`
  """

  ts_web_test(
      tags = tags + [
          # Users don't need to know that this tag is required to run under ibazel
          "ibazel_notify_changes",
          # Always attach this label to allow filtering, eg. envs w/ no browser
          "browser:chromium-system",
      ],
      # Our binary dependency must be in data[] for collect_data to pick it up
      # FIXME: maybe we can just ask the attr._karma for its runfiles attr
      data = data + ["@build_bazel_rules_typescript//internal/karma:karma_bin"],
      **kwargs)

def ts_web_test_suite(
  name,
  browsers=["@io_bazel_rules_webtesting//browsers:chromium-local"],
  args=None,
  browser_overrides=None,
  config=None,
  flaky=None,
  local=None,
  shard_count=None,
  size=None,
  tags = [],
  test_suite_tags=None,
  timeout=None,
  visibility=None,
  web_test_data=[],
  wrapped_test_tags=None,
  **remaining_keyword_args):
  """Defines a test_suite of web_test targets that wrap a ts_web_test target.

  Args:
    name: The base name of the test.
    browsers: A sequence of labels specifying the browsers to use.
    args: Args for web_test targets generated by this extension.
    browser_overrides: Dictionary; optional; default is an empty dictionary. A
      dictionary mapping from browser names to browser-specific web_test
      attributes, such as shard_count, flakiness, timeout, etc. For example:
      {'//browsers:chrome-native': {'shard_count': 3, 'flaky': 1}
       '//browsers:firefox-native': {'shard_count': 1, 'timeout': 100}}.
    config: Label; optional; Configuration of web test features.
    flaky: A boolean specifying that the test is flaky. If set, the test will
      be retried up to 3 times (default: 0)
    local: boolean; optional.
    shard_count: The number of test shards to use per browser. (default: 1)
    size: A string specifying the test size. (default: 'large')
    tags: A list of test tag strings to apply to each generated web_test target.
      This macro adds a couple for ibazel.
    test_suite_tags: A list of tag strings for the generated test_suite.
    timeout: A string specifying the test timeout (default: computed from size)
    visibility: List of labels; optional.
    web_test_data: Data dependencies for the web_test.
    wrapped_test_tags: A list of test tag strings to use for the wrapped test
    **remaining_keyword_args: Arguments for the wrapped test target.
  """
  # Check explicitly for None so that users can set this to the empty list
  if wrapped_test_tags == None:
    wrapped_test_tags = DEFAULT_WRAPPED_TEST_TAGS

  size = size or "large"

  wrapped_test_name = name + "_wrapped_test"

  # Users don't need to know that this tag is required to run under ibazel
  tags = tags + ["ibazel_notify_changes"]

  # Our binary dependency must be in data[] for collect_data to pick it up
  # FIXME: maybe we can just ask the attr._karma for its runfiles attr
  web_test_data = web_test_data + ["@build_bazel_rules_typescript//internal/karma:karma_bin"]

  ts_web_test(
      name=wrapped_test_name,
      args=args,
      flaky=flaky,
      local=local,
      shard_count=shard_count,
      size=size,
      tags=wrapped_test_tags,
      timeout=timeout,
      visibility=["//visibility:private"],
      **remaining_keyword_args)

  web_test_suite(
      name=name,
      launcher=":"+wrapped_test_name,
      args=args,
      browsers=browsers,
      browser_overrides=browser_overrides,
      config=config,
      data=web_test_data,
      flaky=flaky,
      local=local,
      shard_count=shard_count,
      size=size,
      tags=tags,
      test=wrapped_test_name,
      test_suite_tags=test_suite_tags,
      timeout=timeout,
      visibility=visibility)
