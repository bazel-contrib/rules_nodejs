# Execute first test.
OUTPUT=$(${RUNFILES_DIR}/npm_packages_karma_stack_trace/karma_test_chromium-local)

# Test whether the package relative TS path is printed in stack trace.
echo ${OUTPUT} | grep -q "(failing.spec.ts:7:17"
if [[ "$?" != "0" ]]; then
  echo "Did not find 'failing.spec.ts:7:17' in Karma stack trace"
  exit 1
fi

# Test whether the package relative path inside a subdirectory is printed.
echo ${OUTPUT} | grep -q "(test_folder/test.spec.ts:5:23"
if [[ "$?" != "0" ]]; then
  echo "Did not find 'test_folder/test.spec.ts:5:23' in Karma stack trace"
  exit 1
fi

# Test whether stack trace with multiple stack frames mapped get printed.
echo ${OUTPUT} | grep -q "(test_folder/hello.ts:6:8"
if [[ "$?" != "0" ]]; then
  echo "Did not find 'test_folder/hello.ts:6:8' in Karma stack trace"
  exit 1
fi

exit 0
