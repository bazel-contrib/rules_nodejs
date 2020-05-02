import {browser, by, element, ExpectedConditions} from 'protractor';

// This test uses Protractor without Angular, so disable Angular features
browser.waitForAngularEnabled(false);

// Since we don't have a protractor bazel rule yet, the test is brought up in
// parallel with building the service under test. So the timeout must include
// compiling the application as well as starting the server.
const timeoutMs = 90 * 1000;

describe('protocol_buffers', () => {
  beforeAll(() => {
    browser.get('');
    // Don't run any specs until we see a <div> on the page.
    browser.wait(ExpectedConditions.presenceOf(element(by.css('h1.ts1'))), timeoutMs);
  }, timeoutMs);

  it('should display: Car from server: Porsche', (done) => {
    const h1 = element(by.css('h1.ts1'));
    h1.getText().then((t) => expect(t).toEqual(`Car from server: Porsche`));
    done();
  });
});
