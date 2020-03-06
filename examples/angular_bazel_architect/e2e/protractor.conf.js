// @ts-check
// Protractor configuration file, see link for more information
// https://github.com/angular/protractor/blob/master/lib/config.ts

const {SpecReporter} = require('jasmine-spec-reporter');

/**
 * @type { import("protractor").Config }
 */
exports.config = {
  allScriptsTimeout: 11000,
  specs: ['./src/**/*.e2e-spec.ts'],
  directConnect: true,
  baseUrl: 'http://localhost:4200/',
  framework: 'jasmine',
  jasmineNodeOpts: {showColors: true, defaultTimeoutInterval: 30000, print: function() {}},
  onPrepare() {
    require('ts-node').register({project: require('path').join(__dirname, './tsconfig.json')});
    jasmine.getEnv().addReporter(new SpecReporter({spec: {displayStacktrace: true}}));
  },
  capabilities: {
    browserName: 'chrome',
    chromeOptions: {
      // `--no-sandbox` flag disables the chrome sandbox because it causes Chrome to crash on some
      // environments
      // http://chromedriver.chromium.org/help/chrome-doesn-t-start
      // https://github.com/puppeteer/puppeteer/blob/v1.0.0/docs/troubleshooting.md#chrome-headless-fails-due-to-sandbox-issues
      // `--headess` flag runs the browser in headless mode
      // `--disable-gpu` flag disables GPU usage because it causes Chrome to crash on some
      // environments
      // `--disable-dev-shm-usage` flag disables the usage of `/dev/shm` because it causes Chrome to
      // crash on some environments.
      // https://github.com/puppeteer/puppeteer/blob/v1.0.0/docs/troubleshooting.md#tips
      // https://stackoverflow.com/questions/50642308/webdriverexception-unknown-error-devtoolsactiveport-file-doesnt-exist-while-t
      // `--hide-scrollbars` flag comes from puppeteer headless mode defaults
      // `--mute-audio` flag comes from puppeteer headless mode defaults
      args: [
        '--no-sandbox', '--headless', '--disable-gpu', '--disable-dev-shm-usage',
        '--hide-scrollbars', '--mute-audio'
      ]
    }
  }
};