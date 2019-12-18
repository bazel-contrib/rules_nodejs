// The function exported from this file is used by the protractor_web_test_suite.
// It is passed to the `onPrepare` configuration setting in protractor and executed
// before running tests.
//
// If the function returns a promise, as it does here, protractor will wait
// for the promise to resolve before running tests.

const protractorUtils = require('@bazel/protractor/protractor-utils');
const protractor = require('protractor');
const path = require('path');

module.exports = function(config) {
  // In this example, `@bazel/protractor/protractor-utils` is used to run
  // the server. protractorUtils.runServer() runs the server on a randomly
  // selected port (given a port flag to pass to the server as an argument).
  // The port used is returned in serverSpec and the protractor serverUrl
  // is the configured.
  const isProdserver = path.basename(config.server, path.extname(config.server)) === 'prodserver';
  return protractorUtils
      // If running prodserver (http-server) we need to pass the package
      // name which we can get from the dirname of the TEST_BINARY.
      .runServer(
          config.workspace, config.server, isProdserver ? '-p' : '-port',
          isProdserver ? ['package'] : [])
      .then(serverSpec => {
        protractor.browser.baseUrl = `http://localhost:${serverSpec.port}`;
      });
};
