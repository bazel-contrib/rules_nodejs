/**
 * @fileoverview extensions to TypeScript functionality around error handling
 * (ts.Diagnostics).
 */

import * as ts from 'typescript';

import {BazelOptions} from './tsconfig';

/**
 * If the current compilation was a compilation test expecting certain
 * diagnostics, filter out the expected diagnostics, and add new diagnostics
 * (aka errors) for non-matched diagnostics.
 */
export function filterExpected(
    bazelOpts: BazelOptions, diagnostics: ts.Diagnostic[],
    formatFn = uglyFormat): ts.Diagnostic[] {
  if (!bazelOpts.expectedDiagnostics.length) return diagnostics;

  // The regex contains two parts:
  // 1. Optional position: '\(5,1\)'
  // 2. Required TS error: 'TS2000: message text.'
  // Need triple escapes because the expected diagnostics that we're matching
  // here are regexes, too.
  const ERROR_RE = /^(?:\\\((\d*),(\d*)\\\).*)?TS(-?\d+):(.*)/;
  const incorrectErrors =
      bazelOpts.expectedDiagnostics.filter(e => !e.match(ERROR_RE));
  if (incorrectErrors.length) {
    const msg = `Expected errors must match regex ${ERROR_RE}\n\t` +
        `expected errors are "${incorrectErrors.join(', ')}"`;
    return [{
      file: undefined!,
      start: 0,
      length: 0,
      messageText: msg,
      category: ts.DiagnosticCategory.Error,
      code: 0,
    }];
  }

  // ExpectedDiagnostics represents the "expected_diagnostics" users provide in
  // the BUILD file. It is used for easier comparsion with the actual
  // diagnostics.
  interface ExpectedDiagnostics {
    line: number;
    column: number;
    expected: string;
    code: number;
    regexp: RegExp;
    matched: boolean;
  }

  const expectedDiags: ExpectedDiagnostics[] =
      bazelOpts.expectedDiagnostics.map(expected => {
        const m = expected.match(/^(?:\\\((\d*),(\d*)\\\).*)?TS(-?\d+):(.*)$/);
        if (!m) {
          throw new Error(
              'Incorrect expected error, did you forget character escapes in ' +
              expected);
        }
        const [, lineStr, columnStr, codeStr, regexp] = m;
        const [line, column, code] = [lineStr, columnStr, codeStr].map(str => {
          const i = Number(str);
          if (Number.isNaN(i)) {
            return 0;
          }
          return i;
        });
        return {
          line,
          column,
          expected,
          code,
          regexp: new RegExp(regexp),
          matched: false,
        };
      });

  const unmatchedDiags = diagnostics.filter(diag => {
    let line = -1;
    let character = -1;
    if (diag.file !== undefined && diag.start !== undefined) {
      ({line, character} =
           ts.getLineAndCharacterOfPosition(diag.file, diag.start));
    }
    let matched = false;
    const msg = formatFn(bazelOpts.target, [diag]);
    // checkDiagMatchesExpected checks if the expected diagnostics matches the
    // actual diagnostics.
    const checkDiagMatchesExpected =
        (expDiag: ExpectedDiagnostics, diag: ts.Diagnostic) => {
          if (expDiag.code !== diag.code || msg.search(expDiag.regexp) === -1) {
            return false;
          }
          // line and column are optional fields, only check them if they
          // are explicitly specified.
          // line and character are zero based.
          if (expDiag.line !== 0 && expDiag.line !== line + 1) {
            return false;
          }
          if (expDiag.column !== 0 && expDiag.column !== character + 1) {
            return false;
          }
          return true;
        };

    for (const expDiag of expectedDiags) {
      if (checkDiagMatchesExpected(expDiag, diag)) {
        expDiag.matched = true;
        matched = true;
        // continue, one diagnostic may match multiple expected errors.
      }
    }
    return !matched;
  });

  const unmatchedErrors = expectedDiags.filter(err => !err.matched).map(err => {
    const file = ts.createSourceFile(
        bazelOpts.target, '/* fake source as marker */',
        ts.ScriptTarget.Latest);
    const messageText =
        `Expected a compilation error matching ${JSON.stringify(err.expected)}`;
    return {
      file,
      start: 0,
      length: 0,
      messageText,
      category: ts.DiagnosticCategory.Error,
      code: err.code,
    };
  });

  return unmatchedDiags.concat(unmatchedErrors);
}

/**
 * Formats the given diagnostics, without pretty printing.  Without colors, it's
 * better for matching against programmatically.
 * @param target The bazel target, e.g. //my/package:target
 */
export function uglyFormat(
    target: string, diagnostics: ReadonlyArray<ts.Diagnostic>): string {
  const diagnosticsHost: ts.FormatDiagnosticsHost = {
    getCurrentDirectory: () => ts.sys.getCurrentDirectory(),
    getNewLine: () => ts.sys.newLine,
    // Print filenames including their relativeRoot, so they can be located on
    // disk
    getCanonicalFileName: (f: string) => f
  };
  return ts.formatDiagnostics(diagnostics, diagnosticsHost);
}

/**
 * Pretty formats the given diagnostics (matching the --pretty tsc flag).
 * @param target The bazel target, e.g. //my/package:target
 */
export function format(
    target: string, diagnostics: ReadonlyArray<ts.Diagnostic>): string {
  const diagnosticsHost: ts.FormatDiagnosticsHost = {
    getCurrentDirectory: () => ts.sys.getCurrentDirectory(),
    getNewLine: () => ts.sys.newLine,
    // Print filenames including their relativeRoot, so they can be located on
    // disk
    getCanonicalFileName: (f: string) => f
  };
  return ts.formatDiagnosticsWithColorAndContext(diagnostics, diagnosticsHost);
}
