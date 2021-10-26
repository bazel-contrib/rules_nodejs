// The `@angular/compiler-cli` module is optional so we only
// access as type-only at the file top-level.
import type {NgTscPlugin} from '@angular/compiler-cli';

type CompilerCliModule = typeof import('@angular/compiler-cli');
type CompilerInteropExports = Partial<CompilerCliModule> & {default?: CompilerCliModule};


/**
 * Gets the constructor for instantiating the Angular `ngtsc`
 * emit plugin supported by `tsc_wrapped`.
 * @throws An error when the Angular emit plugin could not be retrieved.
 */
export async function getAngularEmitPluginOrThrow(): Promise<typeof NgTscPlugin> {
  // Note: This is an interop allowing for the `@angular/compiler-cli` package
  // to be shipped as strict ESM, or as CommonJS. If the CLI is a CommonJS
  // package (pre v13 of Angular), then the exports are in the `default` property.
  // See: https://nodejs.org/api/esm.html#esm_import_statements.
  // Note: TypeScript downlevels the dynamic `import` to a `require` that is
  // not compatible with ESM. We create a function to workaround this issue.
  const exports = await loadEsmOrFallbackToRequire<CompilerInteropExports>(
      '@angular/compiler-cli');
  const plugin = exports.NgTscPlugin ?? exports.default?.NgTscPlugin;

  if (plugin === undefined) {
    throw new Error('Could not find `NgTscPlugin` export in `@angular/compiler-cli`.');
  }

  return plugin;
}

async function loadEsmOrFallbackToRequire<T>(moduleName: string): Promise<T> {
  try {
    return await new Function('m', `return import(m);`)(moduleName);
  } catch {
    // If the dynamic import failed, we still re-try with `require` because
    // some NodeJS versions do not even support the dynamic import expression.
    return require(moduleName);
  }
}