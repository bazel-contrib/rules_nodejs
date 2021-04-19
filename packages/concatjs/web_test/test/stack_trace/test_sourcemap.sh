# Execute first test.
OUTPUT=$(${RUNFILES_DIR}/build_bazel_rules_nodejs/packages/concatjs/web_test/test/stack_trace/karma_test_chromium-local.sh)

# Test whether the package relative TS path is printed in stack trace.
echo ${OUTPUT} | grep -q "(packages/concatjs/web_test/test/stack_trace/failing.spec.ts:7:18"
if [[ "$?" != "0" ]]; then
  echo "Did not find '(packages/concatjs/web_test/test/stack_trace/failing.spec.ts:7:18' in Karma stack trace"
  echo $OUTPUT
  exit 1
fi

# Test whether the package relative path inside a subdirectory is printed.
echo ${OUTPUT} | grep -q "(packages/concatjs/web_test/test/stack_trace/test_folder/test.spec.ts:5:24"
if [[ "$?" != "0" ]]; then
  echo "Did not find '(packages/concatjs/web_test/test/stack_trace/test_folder/test.spec.ts:5:24' in Karma stack trace"
  exit 1
fi

# Test whether stack trace with multiple stack frames mapped get printed.
echo ${OUTPUT} | grep -q "(packages/concatjs/web_test/test/stack_trace/test_folder/hello.ts:6:9"
if [[ "$?" != "0" ]]; then
  echo "Did not find '(packages/concatjs/web_test/test/stack_trace/test_folder/hello.ts:6:9' in Karma stack trace"
  exit 1
fi

exit 0
