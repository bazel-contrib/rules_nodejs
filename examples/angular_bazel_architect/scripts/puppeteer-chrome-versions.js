// Mapping of puppeteer releases to their default Chrome version
// derived from https://github.com/puppeteer/puppeteer/blob/master/docs/api.md.
// The puppeteer package.json file contains the compatible Chrome revision such as
// "chromium_revision": "722234" but this does not map easily to the Chrome version
// so we use this mapping here instead.
module.exports = {
  '2.1.1': '80.0.3987.0',
  '2.1.0': '80.0.3987.0',
  '2.0.0': '79.0.3942.0',
  '1.20.0': '78.0.3882.0',
  '1.19.0': '77.0.3803.0',
  '1.17.0': '76.0.3803.0',
  '1.15.0': '75.0.3765.0',
  '1.13.0': '74.0.3723.0',
  '1.12.2': '73.0.3679.0',
};
