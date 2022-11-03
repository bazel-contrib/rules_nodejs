
// @ts-check
const cypress = require('cypress');
const path = require('path');

const [,, configFilePath,, cypressBinRelativePath] = process.argv;
process.env.HOME = process.env['TEST_TMPDIR'];
process.env.CYPRESS_RUN_BINARY = path.join(process.cwd(), cypressBinRelativePath);
process.env.CYPRESS_CACHE_FOLDER = process.env['TEST_TMPDIR'];
process.env.TERM = process.env['TERM'] || 'linux';

// Detect if running as "test", using well-known env. var. (see go/test-encyclopedia)
const command = process.env.BUILD_WORKSPACE_DIRECTORY ? 'open' : 'run';

/** @type {Partial<CypressCommandLine.CypressCommonOptions>} */
const baseConfig = {
  configFile: configFilePath,
};

/** @type {Partial<CypressCommandLine.CypressRunOptions>} */
const runConfig = {
  ...baseConfig,
  headless: true,
  browser: 'chrome',
};

;(async () => {
  const result = await cypress[command]({
    ...(command === 'open' ? baseConfig : runConfig)
  });

  if (result && 'failures' in result) {
    process.stderr.write('Could not execute tests');
    process.stderr.write(result.message);
    process.exit(result.failures);
  }
  
  if (result && 'totalFailed' in result) {
    if (result.totalFailed > 0) {
      process.stderr.write('Some tests failed');
      process.exit(result.totalFailed);
    }
  }
})()
