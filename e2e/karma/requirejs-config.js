require.config({
  paths: {
    // Configure some fake AMD module that exists and should not cause a loading
    // error message from the "karma-requirejs" plugin which is enabled by default.
    'unnamed-module': '/base/e2e_karma/unnamed-amd-module',
    'unnamed-module-invalid-file': '/some-invalid-file-path',
  }
});
