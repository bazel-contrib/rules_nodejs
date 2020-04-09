// Loaded from common-js format
// node_modules/jest-websocket-mock/lib/jest-websocket-mock.cjs.js
const WS = require('jest-websocket-mock').default;
// Loaded from js format
// node_modules/mock-socket/dist/mock-socket.js"
const Server = require('mock-socket').Server;

// Fails without node-patches symlink guards fix in
// https://github.com/bazelbuild/rules_nodejs/pull/1800
// and node_modules execroot fix in
// https://github.com/bazelbuild/rules_nodejs/pull/1805:
// ```
// ==================== Test output for //internal/linker/test/issue_1813:test:
// FAIL internal/linker/test/issue_1813/index.test.js
//   ✕ jest-websocket-mock (12ms)
//
//   ● jest-websocket-mock
//
//     expect(received).toBeInstanceOf(expected)
//
//     Expected constructor: Server
//     Received constructor: Server
//
//       12 | test('jest-websocket-mock', () => {
//       13 |   const ws = new WS('ws://localhost:1234');
//     > 14 |   expect(ws.server).toBeInstanceOf(Server);
//          |                     ^
//       15 | });
//       16 |
//
//       at Object.<anonymous> (index.test.js:14:21)
//
// Test Suites: 1 failed, 1 total
// Tests:       1 failed, 1 total
// Snapshots:   0 total
// Time:        1.453s
// Ran all test suites.
// ================================================================================
// ```
// See https://github.com/bazelbuild/rules_nodejs/issues/1813
test('jest-websocket-mock', () => {
  const ws = new WS('ws://localhost:1234');
  expect(ws.server).toBeInstanceOf(Server);
});
