'use strict';
// Use process.cwd() so that this script is portable and can be used in /aio
// where this will require /aio/node_modules/puppeteer
const puppeteerPkgPath = require.resolve('puppeteer/package.json', {paths: [process.cwd()]});
const puppeteerVersion = require(puppeteerPkgPath).version;
const chromeVersionMap = require('./puppeteer-chrome-versions');
const spawnSync = require('child_process').spawnSync;

const version = chromeVersionMap[puppeteerVersion];
if (!version) {
  console.error(`[webdriver-manager-update.js] Error: Could not find Chrome version for Puppeteer version '${
      puppeteerVersion}' in Chrome/Puppeteer version map. Please update /scripts/puppeteer-chrome-versions.js.`);
  process.exit(1);
}

const args = [
  'webdriver-manager',
  'update',
  '--gecko=false',
  '--standalone=false',
  '--versions.chrome',
  version,
  // Append additional user arguments after script default arguments
  ...process.argv.slice(2),
];

const result = spawnSync('yarn', args, {shell: true, stdio: 'inherit'});
if (result.error) {
  console.error(`[webdriver-manager-update.js] Call to 'yarn ${
      args.join(' ')}' failed with error code ${result.error.code}`);
  process.exit(result.status);
}
if (result.status) {
  console.error(`[webdriver-manager-update.js] Call to 'yarn ${
      args.join(' ')}' failed with error code ${result.status}`);
  process.exit(result.status);
}
