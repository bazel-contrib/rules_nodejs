exports.config = {
  suites: {
    root: 'dist/bin/*_e2e_test.js',
    subpackage: 'dist/bin/subpackage/*_e2e_test.js',
    genrule: 'dist/bin/genrule/*_e2e_test.js',
  },
  capabilities: {browserName: 'chrome', chromeOptions: {args: ['--no-sandbox']}},
  directConnect: true,
  baseUrl: 'http://localhost:8080/',
  framework: 'jasmine',
};
