/// <amd-module name="examples_webtesting/setup_script"/>

// Setup global value that the test expect to be present.
(window as any).setupGlobal = 'setupGlobalValue';

// at least one import or export is needed for this file to
// be compiled into an named-UMD module by typescript
export {};
