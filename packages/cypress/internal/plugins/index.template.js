const fs = require('fs');
const {join, basename, normalize} = require('path');

const basePluginShortPath = 'TEMPLATED_pluginsFile';
const integrationFileShortPaths = TEMPLATED_integrationFileShortPaths;

const runfiles = require(process.env['BAZEL_NODE_RUNFILES_HELPER']);
const basePlugin = require(runfiles.resolveWorkspaceRelative(basePluginShortPath));
const cwd = process.cwd();

const browserifyFactory = require(normalize(`TEMPLATED_@cypress/browserify-preprocessor`));
const browserify = browserifyFactory(browserifyFactory.defaultOptions);

module.exports = (on, config) => {
  // Load in the user's cypress plugin
  config = basePlugin(on, config);

  // Set test files to tests passed as `srcs`
  config.integrationFolder = cwd;
  config.testFiles = integrationFileShortPaths;

  // Set screenshots folder to a writable directory
  const screenshotsFolder = join(process.env['TEST_UNDECLARED_OUTPUTS_DIR'], 'screenshots');
  fs.mkdirSync(screenshotsFolder);
  config.screenshotsFolder = screenshotsFolder;

  // Set videos folder to a writable directory
  const videosFolder = join(process.env['TEST_UNDECLARED_OUTPUTS_DIR'], 'videos');
  fs.mkdirSync(videosFolder);
  config.videosFolder = videosFolder;

  // Chrome sandboxing must be disabled for execution during bazel test.
  config.chromeWebSecurity = false;

  // Set file preprocessing output path to writable directory.
  on('file:preprocessor', (file) => {
    file.outputPath = join(process.env['TEST_UNDECLARED_OUTPUTS_DIR'], basename(file.outputPath));
    return browserify(file);
  });

  return config;
};
