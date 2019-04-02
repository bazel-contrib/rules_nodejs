module.exports = function(config) {
  config.set({
    plugins: ['karma-json-result-reporter'],
    reporters: ['dots', 'progress', 'json-result'],
    logLevel: config.LOG_DEBUG,
    colors: false,
    jsonResultReporter: {
      outputFile: `${process.env['TEST_UNDECLARED_OUTPUTS_DIR']}/karma-result.json`,
      isSynchronous: true,
    },
  });
}
