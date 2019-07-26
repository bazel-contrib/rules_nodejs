// This test must be run with --define=some_env=some_value.
// Use `bazel test //examples/define_var --define=some_env=some_value`.
// Note that use of --define causes the entire build to be non-incremental
// since --define can affect the output of any action.
if (process.env['some_env'] !== 'some_value') {
  console.error('should accept vars; must be run with --define=some_env=some_value');
  process.exitCode = 1;
}
