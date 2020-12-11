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

import {runServer} from '@bazel/protractor';

describe('Bazel protractor utils', () => {
  it('should be able to start devserver', async () => {
    // Test will automatically time out if the server couldn't be launched as expected.
    await runServer(
        'build_bazel_rules_nodejs', 'packages/protractor/test/protractor-utils/fake-devserver' + (process.platform == "win32" ? ".bat" : ".sh"),
        '--port', []);
  });
});
