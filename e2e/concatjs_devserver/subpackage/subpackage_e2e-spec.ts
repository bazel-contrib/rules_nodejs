import {browser, by, element} from 'protractor';

describe('subpackage', () => {
  beforeAll(async () => {
    await browser.waitForAngularEnabled(false);
    await browser.get('');
  });

  // Ensures that the "concatjs_devserver" properly injects and loads static files which
  // are in the current workspace, but not part of the current Bazel package. See
  // related issue: https://github.com/bazelbuild/rules_typescript/issues/409
  it('should be able to properly load the injected CSS file', async () => {
    const bodyElement = element(by.css('body'));
    expect(await bodyElement.getCssValue('background')).toContain('rgb(255, 0, 0)');
  });
});
