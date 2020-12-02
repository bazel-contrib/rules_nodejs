/**
 * @license
 * Copyright 2017 The Bazel Authors. All rights reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 *
 * You may obtain a copy of the License at
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
const runfiles = require(process.env['BAZEL_NODE_RUNFILES_HELPER']);
const path = require('path');

function log_verbose(...m) {
  // This is a template file so we use __filename to output the actual filename
  if (!!process.env['VERBOSE_LOGS']) console.error(`[${path.basename(__filename)}]`, ...m);
}

const configPath = 'TMPL_config';
const onPreparePath = 'TMPL_on_prepare';
const workspace = 'TMPL_workspace';
const server = 'TMPL_server';

log_verbose(`running with
  cwd: ${process.cwd()}
  configPath: ${configPath}
  onPreparePath: ${onPreparePath}
  workspace: ${workspace}
  server: ${server}`);

// Helper function to warn when a user specified value is being overwritten
function setConf(conf, name, value, msg) {
  if (conf[name] && conf[name] !== value) {
    console.warn(
        `Your protractor configuration specifies an option which is overwritten by Bazel: '${
            name}' ${msg}`);
  }
  conf[name] = value;
}

function mergeCapabilities(conf, capabilities) {
  if (conf.capabilities) {
    if (conf.capabilities.browserName === capabilities.browserName) {
      // there are capabilities to merge
      if (capabilities.browserName === 'chrome') {
        conf.capabilities.chromeOptions = conf.capabilities.chromeOptions || {};
        conf.capabilities.chromeOptions.binary = capabilities.chromeOptions.binary;
        conf.capabilities.chromeOptions.args = conf.capabilities.chromeOptions.args || [];
        conf.capabilities.chromeOptions.args.push(...capabilities.chromeOptions.args);
        console.warn(
            `Your protractor configuration specifies capabilities for browser '${
                conf.capabilities.browserName}'
which will be merged with capabilities provided by Bazel resulting in:`,
            JSON.stringify(conf.capabilities, null, 2));
      } else {
        // TODO(gmagolan): implement firefox support for protractor
        throw new Error(
            `Unexpected browserName ${capabilities.browserName} for capabilities merging`);
      }
    } else {
      console.warn(`Your protractor configuration specifies capabilities for browser '${
          conf.capabilities.browserName}' which will be overwritten by Bazel`);
      conf.capabilities = capabilities;
    }
  } else {
    conf.capabilities = capabilities;
  }
}

let conf = {};

// Import the user's base protractor configuration if specified
if (configPath) {
  const baseConf = require(runfiles.resolve(configPath));
  if (!baseConf.config) {
    throw new Error('Invalid base protractor configuration. Expected config to be exported.');
  }
  conf = baseConf.config;
  log_verbose(`base protractor configuration: ${JSON.stringify(conf, null, 2)}`);
}

// Import the user's on prepare function if specified
if (onPreparePath) {
  const onPrepare = require(runfiles.resolve(onPreparePath));
  if (typeof onPrepare === 'function') {
    const original = conf.onPrepare;
    conf.onPrepare = function() {
      return Promise.resolve(original ? original() : null)
          .then(() => Promise.resolve(onPrepare({workspace, server})));
    };
  } else {
    throw new Error(
        'Invalid protractor on_prepare script. Expected a function as the default export.');
  }
}

// Override the user's base protractor configuration as appropriate based on the
// karma_web_test_suite & rules_webtesting WEB_TEST_METADATA attributes
setConf(conf, 'framework', 'jasmine2', 'is set to jasmine2');

const specs =
    [TMPL_specs].map(s => require.resolve(s)).filter(s => /(\b|_)(spec|test)\.js$/.test(s));

setConf(conf, 'specs', specs, 'are determined by the srcs and deps attribute');

// WEB_TEST_METADATA is configured in rules_webtesting based on value
// of the browsers attribute passed to karma_web_test_suite
// We setup the protractor configuration based on the values in this object
if (process.env['WEB_TEST_METADATA']) {
  const webTestMetadata = require(process.env['WEB_TEST_METADATA']);
  log_verbose(`WEB_TEST_METADATA: ${JSON.stringify(webTestMetadata, null, 2)}`);
  if (webTestMetadata['environment'] === 'local') {
    // When a local chrome or firefox browser is chosen such as
    // "@io_bazel_rules_webtesting//browsers:chromium-local" or
    // "@io_bazel_rules_webtesting//browsers:firefox-local"
    // then the 'environment' will equal 'local' and
    // 'webTestFiles' will contain the path to the binary to use
    const webTestNamedFiles = webTestMetadata['webTestFiles'][0]['namedFiles'];
    const headless = !process.env['DISPLAY'];
    if (webTestNamedFiles['CHROMIUM']) {
      const chromeBin = require.resolve(webTestNamedFiles['CHROMIUM']);
      const chromeDriver = require.resolve(webTestNamedFiles['CHROMEDRIVER']);

      // The sandbox needs to be disabled, because it causes Chrome to crash on some environments.
      // See: http://chromedriver.chromium.org/help/chrome-doesn-t-start
      const args = ['--no-sandbox'];
      if (headless) {
        args.push('--headless', '--disable-gpu', '--disable-dev-shm-usage');
      }
      setConf(conf, 'directConnect', true, 'is set to true for chrome');
      setConf(conf, 'chromeDriver', chromeDriver, 'is determined by the browsers attribute');
      mergeCapabilities(conf, {
        browserName: 'chrome',
        chromeOptions: {
          binary: chromeBin,
          args: args,
        }
      });
    }
    if (webTestNamedFiles['FIREFOX']) {
      // TODO(gmagolan): implement firefox support for protractor
      throw new Error('Firefox not yet support by protractor_web_test_suite');

      // const firefoxBin = require.resolve(webTestNamedFiles['FIREFOX'])
      // const args = [];
      // if (headless) {
      //   args.push("--headless")
      //   args.push("--marionette")
      // }
      // setConf(conf, 'seleniumAddress', process.env.WEB_TEST_HTTP_SERVER.trim() + "/wd/hub", 'is
      // configured by Bazel for firefox browser')
      // mergeCapabilities(conf, {
      //   browserName: "firefox",
      //   'moz:firefoxOptions': {
      //     binary: firefoxBin,
      //     args: args,
      //   }
      // }, 'is determined by the browsers attribute');
    }
  } else {
    console.warn(`Unknown WEB_TEST_METADATA environment '${webTestMetadata['environment']}'`);
  }
}

// Export the complete protractor configuration
log_verbose(`protractor configuration: ${JSON.stringify(conf, null, 2)}`);

exports.config = conf;
