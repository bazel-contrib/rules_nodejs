import {AppPage} from './app.po';

describe('angular example application', () => {
  let page: AppPage;

  beforeEach(() => {
    page = new AppPage();
  });

  it('should display: Hello World!', async () => {
    await page.navigateTo();
    expect(await page.getParagraphText()).toEqual(`Hello Adolph Blain...`);
    await page.typeInInput('!');
    expect(await page.getParagraphText()).toEqual(`Hello Adolph Blain...!`);
  });
});
