# Execute first test.
OUTPUT=$(${RUNFILES_DIR}/rules_nodejs/packages/karma/test/stack_trace/karma_test_chromium-local.sh)

# Test whether the package relative TS path is printed in stack trace.
echo ${OUTPUT} | grep -q "(packages/karma/test/stack_trace/failing.spec.ts:7:17"
if [[ "$?" != "0" ]]; then
  echo "Did not find '(packages/karma/test/stack_trace/failing.spec.ts:7:17' in Karma stack trace"
  echo $OUTPUT
  exit 1
fi

# Test whether the package relative path inside a subdirectory is printed.
echo ${OUTPUT} | grep -q "(packages/karma/test/stack_trace/test_folder/test.spec.ts:5:23"
if [[ "$?" != "0" ]]; then
  echo "Did not find '(packages/karma/test/stack_trace/test_folder/test.spec.ts:5:23' in Karma stack trace"
  exit 1
fi

# Test whether stack trace with multiple stack frames mapped get printed.
echo ${OUTPUT} | grep -q "(packages/karma/test/stack_trace/test_folder/hello.ts:6:8"
if [[ "$?" != "0" ]]; then
  echo "Did not find '(packages/karma/test/stack_trace/test_folder/hello.ts:6:8' in Karma stack trace"
  exit 1
fi

exit 0
