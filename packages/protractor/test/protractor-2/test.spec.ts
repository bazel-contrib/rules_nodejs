/**
 * @license
 * Copyright 2017 The Bazel Authors. All rights reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 *
 * You may obtain a copy of the License at
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import {browser, by, element, ExpectedConditions} from 'protractor';


// This test uses Protractor without Angular, so disable Angular features
browser.waitForAngularEnabled(false);

describe('app', () => {
  beforeAll(() => {
    browser.get('');
    browser.wait(ExpectedConditions.presenceOf(element(by.css('div.ts1'))), 100000);
  });

  it('should display: Hello, Protractor', (done) => {
    const div = element(by.css('div.ts1'));
    div.getText().then(t => expect(t).toEqual(`Hello, Protractor`));
    done();
  });
});
