/// <amd-module name="concatjs_devserver_directory_artifacts/genrule/app_e2e-spec"/>

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
    browser.wait(ExpectedConditions.presenceOf(element(by.css('div.ts1'))), timeoutMs);
    browser.wait(ExpectedConditions.presenceOf(element(by.css('div.ts2'))), timeoutMs);
    browser.wait(ExpectedConditions.presenceOf(element(by.css('div.ts3'))), timeoutMs);
  }, timeoutMs);

  it('should display: Hello, TypeScript', async (done) => {
    const text = await element(by.css('div.ts1')).getText();
    expect(text).toEqual(`Hello, TypeScript`);
    done();
  });

  it('should display: Hello, genrule', async (done) => {
    const text = await element(by.css('div.ts2')).getText();
    expect(text).toEqual(`Hello, genrule`);
    done();
  });

  it('should display: location.host', async (done) => {
    const currentUrl = await browser.getCurrentUrl();
    const text = await element(by.css('div.ts3')).getText();
    expect(`http://${text}/`).toEqual(currentUrl);
    done();
  });
});
