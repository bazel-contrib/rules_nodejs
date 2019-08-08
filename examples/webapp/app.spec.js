const {browser, by, element, ExpectedConditions} = require('protractor');

// This test uses Protractor without Angular, so disable Angular features
browser.waitForAngularEnabled(false);

const timeoutMs = 10 * 1000;

describe('app', () => {
  beforeAll(() => {
    browser.get('');
    // Don't run any specs until we see a <div> on the page.
    browser.wait(ExpectedConditions.presenceOf(element(by.css('div.ts1'))), timeoutMs);
  }, timeoutMs);

  it('should display: Hello Webapp', (done) => {
    const div = element(by.css('div.ts1'));
    div.getText().then(t => expect(t).toEqual(`Hello Webapp`));
    done();
  });
});
