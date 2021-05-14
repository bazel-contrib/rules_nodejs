const domino = require("domino");
const path = require("path");

describe("kotlin webapp", () => {
  it("works", () => {
    const html =
      "<html><head><title>fakeTitle</title></head><body></body></html>";
    // Domino gives us enough of the DOM API that we can run our JavaScript in node rather than the
    // browser. That makes this test a lot faster
    global.document = domino.createWindow(html, "/").document;
    // Make all Domino types available as types in the global env.
    Object.assign(global, domino.impl);

    import(path.join(__dirname, "bundle/bundle.js")).then(() => {
      expect(global.document.body.textContent).toEqual("Hello from Kotlin!");
    });
  });
});
