exports.config = {
  suites: {
    root: 'bazel-bin/*_e2e_test.js',
    subpackage: 'bazel-bin/subpackage/*_e2e_test.js',
  },
  capabilities: {browserName: 'chrome', chromeOptions: {args: ['--no-sandbox']}},
  directConnect: true,
  baseUrl: 'http://localhost:8080/',
  framework: 'jasmine',
};
