try {
  require('../jasmine_runner');
} catch (e) {
  // Assert that the error message is about jasmine not being available. In case it's a different
  // exception, just exit with error code **3** (this is the failed tests exit code for Bazel)
  process.exit(e.message.match(/make sure.*jasmine.*available/) ? 0 : 3)
}

