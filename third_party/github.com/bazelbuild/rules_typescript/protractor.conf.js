exports.config = {
  suites: {
    app: 'bazel-bin/examples/app/*_e2e_test.js',
    protocol_buffers: 'bazel-bin/examples/protocol_buffers/*_e2e_test.js',
  },
  capabilities: {
    browserName: 'chrome',
    chromeOptions: {args: ['--no-sandbox']}
  },
  directConnect: true,
  baseUrl: 'http://localhost:8080/',
  framework: 'jasmine',
};
