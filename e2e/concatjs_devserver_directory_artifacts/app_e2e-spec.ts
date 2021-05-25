/// <amd-module name="concatjs_devserver_directory_artifacts/app_e2e-spec"/>

import {browser, by, element, ExpectedConditions} from 'protractor';

// This test uses Protractor without Angular, so disable Angular features
browser.waitForAngularEnabled(false);

const timeoutMs = 10 * 1000;

describe('app', () => {
  beforeAll(() => {
    browser.get('');
    // Don't run any specs until we see a <div> on the page.
    browser.wait(ExpectedConditions.presenceOf(element(by.css('div.ts1'))), timeoutMs);
  }, timeoutMs);

  it('should display: Hello, TypeScript today is May 7, 2019', (done) => {
    const div = element(by.css('div.ts1'));
    div.getText().then(t => expect(t).toEqual(`Hello, TypeScript today is May 7, 2019`));
    done();
  });

  it('should display: firstname: foo', (done) => {
    const div = element(by.css('div.entrypoint-browser'));
    div.getText().then(t => expect(t).toEqual(`firstname: foo`));
    done();
  });

  it('should display: rxjs works with modules!', (done) => {
    const div = element(by.css('div.entrypoint-module'));
    div.getText().then(t => expect(t).toEqual(`rxjs works with modules!`));
    done();
  });
});
