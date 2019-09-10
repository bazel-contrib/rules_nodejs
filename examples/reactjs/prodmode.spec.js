const domino = require('domino');
const path = require('path');
const fs = require('fs');

describe('react webapp', () => {
  it('works', () => {
    const html = fs.readFileSync(path.join(__dirname, 'index.html'));
    // Domino gives us enough of the DOM API that we can run our JavaScript in node rather than the
    // browser. That makes this test a lot faster
    global.window = domino.createWindow(html, '/');
    global.document = global.window.document;
    global.navigator = global.window.navigator;
    // Make all Domino types available as types in the global env.
    Object.assign(global, domino.impl);

import(path.join(__dirname, 'bundle.es2015')).then(() => {expect(global.document.body.textContent.trim()).toEqual('Hello from React!')});
  });
});