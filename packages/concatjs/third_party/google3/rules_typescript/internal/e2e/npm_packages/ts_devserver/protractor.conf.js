exports.config = {
  specs: [
    'bazel-bin/**/*_e2e_test.js',
  ],
  capabilities: {
    browserName: 'chrome',
    chromeOptions: {args: ['--no-sandbox']}
  },
  directConnect: true,
  baseUrl: 'http://localhost:8080/',
  framework: 'jasmine',
};
