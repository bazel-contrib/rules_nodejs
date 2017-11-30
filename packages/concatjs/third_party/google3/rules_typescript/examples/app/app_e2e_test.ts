import {browser, by, element, ExpectedConditions} from 'protractor';

// This test uses Protractor without Angular, so disable Angular features
browser.waitForAngularEnabled(false);

describe('Devserver', () => {
  beforeAll(() => {
    browser.get('');
    // Don't run any specs until we see a <div> on the page.
    browser.wait(
        ExpectedConditions.presenceOf(element(by.css('div.ts1'))),
        /*timeout, must include server build/startup */ 30 * 1000);
  });

  it('should display: Hello world!', (done) => {
    const div = element(by.css('div.ts1'));
    div.getText().then(t => expect(t).toEqual(`Hello, TypeScript`));
    done();
  });
});
