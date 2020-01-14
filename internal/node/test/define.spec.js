// This test must be run with --define=SOME_TEST_ENV=some_value.
// Use `bazel test //examples/define_var --define=SOME_TEST_ENV=some_value`.
// Note that use of --define causes the entire build to be non-incremental
// since --define can affect the output of any action.
if (process.env['SOME_TEST_ENV'] !== 'some_value') {
  console.error('should accept vars; must be run with --define=SOME_TEST_ENV=some_value');
  process.exitCode = 1;
}

// Similar to above but testing another env variable that is expected to be specified with
// `--action_env=SOME_OTHER_ENV=some_other_value`.
if (process.env['SOME_OTHER_ENV'] !== 'some_other_value') {
  console.error(
      'should accept vars; must be run with --action_env=SOME_OTHER_ENV=some_other_value');
  process.exitCode = 1;
}
