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

const protractorUtils = require('@bazel/protractor');
const protractor = require('protractor');
const path = require('path');

module.exports = function(config) {
  if (!global.userOnPrepareGotCalled) {
    throw new Error('Expecting user configuration onPrepare to have been called');
  }
  const isProdserver = path.basename(config.server, path.extname(config.server)) === 'prodserver';
  return protractorUtils
      .runServer(config.workspace, config.server, isProdserver ? '-p' : '-port', [])
      .then(serverSpec => {
        const serverUrl = `http://localhost:${serverSpec.port}`;
        protractor.browser.baseUrl = serverUrl;
      });
};
