import * as ts from 'typescript';

/**
 * A Tsetse check Failure is almost identical to a Diagnostic from TypeScript
 * except that:
 * (1) The error code is defined by each individual Tsetse rule.
 * (2) The optional `source` property is set to `Tsetse` so the host (VS Code
 * for instance) would use that to indicate where the error comes from.
 */
export class Failure {
  constructor(
      private sourceFile: ts.SourceFile, private start: number,
      private end: number, private failureText: string, private code: number) {}

  toDiagnostic(): ts.Diagnostic {
    return {
      file: this.sourceFile,
      start: this.start,
      length: this.end - this.start,
      messageText: this.failureText,
      category: ts.DiagnosticCategory.Error,
      code: this.code,
      // source is the name of the plugin.
      source: 'Tsetse',
    };
  }
}
