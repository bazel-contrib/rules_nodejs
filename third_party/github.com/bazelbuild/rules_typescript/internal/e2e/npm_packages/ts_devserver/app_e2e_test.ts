import {browser, by, element, ExpectedConditions} from 'protractor';

// This test uses Protractor without Angular, so disable Angular features
browser.waitForAngularEnabled(false);

// Since we don't have a protractor bazel rule yet, the test is brought up in
// parallel with building the service under test. So the timeout must include
// compiling the application as well as starting the server.
const timeoutMs = 90 * 1000;

describe('app', () => {
  beforeAll(() => {
    browser.get('');
    // Don't run any specs until we see a <div> on the page.
    browser.wait(
        ExpectedConditions.presenceOf(element(by.css('div.ts1'))),
        timeoutMs);
  }, timeoutMs);

  it('should display: Hello, TypeScript', (done) => {
    const div = element(by.css('div.ts1'));
    div.getText().then(t => expect(t).toEqual(`Hello, TypeScript`));
    done();
  });
});
