import * as ts from 'typescript';

/**
 * A Tsetse check Failure is almost identical to a Diagnostic from TypeScript
 * except that:
 * (1) The error code is defined by each individual Tsetse rule.
 * (2) The optional `source` property is set to `Tsetse` so the host (VS Code
 * for instance) would use that to indicate where the error comes from.
 * (3) There's an optional suggestedFix field.
 */
export class Failure {
  constructor(
      private readonly sourceFile: ts.SourceFile,
      private readonly start: number, private readonly end: number,
      private readonly failureText: string, private readonly code: number,
      private readonly suggestedFix?: Fix) {}

  /**
   * This returns a structure compatible with ts.Diagnostic, but with added
   * fields, for convenience and to support suggested fixes.
   */
  toDiagnostic(): ts.Diagnostic&{end: number, fix?: Fix} {
    return {
      file: this.sourceFile,
      start: this.start,
      end: this.end,  // Not in ts.Diagnostic, but always useful for
                      // start-end-using systems.
      length: this.end - this.start,
      messageText: this.failureText,
      category: ts.DiagnosticCategory.Error,
      code: this.code,
      // source is the name of the plugin.
      source: 'Tsetse',
      fix: this.suggestedFix
    };
  }

  toString(): string {
    return `{ sourceFile:${
        this.sourceFile ? this.sourceFile.fileName : 'unknown'}, start:${
        this.start}, end:${this.end}, fix:${fixToString(this.suggestedFix)} }`;
  }
}

/**
 * A Fix is a potential repair to the associated Failure.
 */
export interface Fix {
  /**
   * The individual text replacements composing that fix.
   */
  changes: IndividualChange[],
}

export interface IndividualChange {
  sourceFile: ts.SourceFile, start: number, end: number, replacement: string
}

/**
 * Stringifies a Fix, replacing the ts.SourceFile with the matching filename.
 */
export function fixToString(f?: Fix) {
  if (!f) return 'undefined';
  return '{' + JSON.stringify(f.changes.map(ic => {
    return {
      start: ic.start,
      end: ic.end,
      replacement: ic.replacement,
      fileName: ic.sourceFile.fileName
    };
  })) +
      '}'
}
