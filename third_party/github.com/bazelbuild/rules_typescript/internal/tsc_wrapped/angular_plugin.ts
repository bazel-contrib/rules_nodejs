// The `@angular/compiler-cli` module is optional so we only
// access as type-only at the file top-level.
import type {NgTscPlugin} from '@angular/compiler-cli';

type CompilerCliModule = typeof import('@angular/compiler-cli');

/**
 * Gets the constructor for instantiating the Angular `ngtsc`
 * emit plugin supported by `tsc_wrapped`.
 */
export async function getAngularEmitPlugin(): Promise<typeof NgTscPlugin|null> {
  try {
    // Note: This is an interop allowing for the `@angular/compiler-cli` package
    // to be shipped as strict ESM, or as CommonJS. If the CLI is a CommonJS
    // package (pre v13 of Angular), then the exports are in the `default` property.
    // See: https://nodejs.org/api/esm.html#esm_import_statements.
    const exports = await import('@angular/compiler-cli') as
        Partial<CompilerCliModule> & {default?: CompilerCliModule}
    return exports.NgTscPlugin ?? exports.default?.NgTscPlugin ?? null;
  } catch {
    return null;
  }
}
