import {browser, by, element} from 'protractor';

export class AppPage {
  async navigateTo() {
    await browser.get(browser.baseUrl + '/hello');
    return browser.waitForAngular();
  }

  async waitForElement(el, timeout = 10000) {
    await browser.wait(() => el.isPresent(), timeout);
    await browser.wait(() => el.isDisplayed(), timeout);
    return el;
  }

  async getParagraphText() {
    return (await this.waitForElement(element(by.css('div#greeting')))).getText();
  }

  async typeInInput(s: string) {
    return (await this.waitForElement(element(by.css('input')))).sendKeys(s);
  }
}
