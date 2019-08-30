// React uses a "isomorphic" package that relies on
// `process.env`, even in the browser.
// Make this type available in TypeScript code.
declare global {
  interface Window {
    process: {}
  }
}
// make this file a module, not a script
export {};
