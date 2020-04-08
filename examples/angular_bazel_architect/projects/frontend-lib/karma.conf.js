// Karma configuration file, see link for more information
// https://karma-runner.github.io/1.0/config/configuration-file.html

// Env var CHROME_BIN is later picked up by karma-chrome-launcher that is triggered by
// `browsers: ['ChromeHeadlessNoSandbox']` below.
// See https://github.com/karma-runner/karma-chrome-launcher#usage for more info.
process.env.CHROME_BIN = require('puppeteer').executablePath();

module.exports = function(config) {
  config.set({
    basePath: '',
    frameworks: ['jasmine', '@angular-devkit/build-angular'],
    plugins: [
      require('karma-jasmine'), require('karma-chrome-launcher'),
      require('karma-jasmine-html-reporter'), require('karma-coverage-istanbul-reporter'),
      require('@angular-devkit/build-angular/plugins/karma')
    ],
    client: {
      clearContext: false  // leave Jasmine Spec Runner output visible in browser
    },
    coverageIstanbulReporter: {
      dir: require('path').join(__dirname, '../../coverage/frontend-lib'),
      reports: ['html', 'lcovonly', 'text-summary'],
      fixWebpackSourcePaths: true
    },
    reporters: ['progress', 'kjhtml'],
    port: 9876,
    colors: true,
    logLevel: config.LOG_INFO,
    autoWatch: true,
    customLaunchers: {
      ChromeHeadlessNoSandbox: {
        base: 'ChromeHeadless',
        // `--no-sandbox` flag disables the chrome sandbox because it causes Chrome to crash on some
        // environments
        // http://chromedriver.chromium.org/help/chrome-doesn-t-start
        // https://github.com/puppeteer/puppeteer/blob/v1.0.0/docs/troubleshooting.md#chrome-headless-fails-due-to-sandbox-issues
        // `--headess` flag runs the browser in headless mode
        // `--disable-gpu` flag disables GPU usage because it causes Chrome to crash on some
        // environments
        // `--disable-dev-shm-usage` flag disables the usage of `/dev/shm` because it causes Chrome
        // to crash on some environments.
        // https://github.com/puppeteer/puppeteer/blob/v1.0.0/docs/troubleshooting.md#tips
        // https://stackoverflow.com/questions/50642308/webdriverexception-unknown-error-devtoolsactiveport-file-doesnt-exist-while-t
        // `--hide-scrollbars` flag comes from puppeteer headless mode defaults
        // `--mute-audio` flag comes from puppeteer headless mode defaults
        flags: [
          '--no-sandbox', '--headless', '--disable-gpu', '--disable-dev-shm-usage',
          '--hide-scrollbars', '--mute-audio'
        ]
      }
    },
    browsers: ['ChromeHeadlessNoSandbox'],
    singleRun: false,
    restartOnFileChange: true
  });
};
