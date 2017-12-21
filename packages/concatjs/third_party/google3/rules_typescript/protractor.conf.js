exports.config = {
  specs: ['bazel-bin/examples/app/*_e2e_test.js'],
  capabilities:
      {browserName: 'chrome', chromeOptions: {args: ['--no-sandbox']}},
  directConnect: true,
  baseUrl: 'http://localhost:5432/',
  framework: 'jasmine',
  jasmineNodeOpts: {defaultTimeoutInterval: 90 * 1000},
};
