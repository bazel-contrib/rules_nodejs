import 'jasmine';
import * as ts from 'typescript';

import * as diagnostics from './diagnostics';
import {BazelOptions} from './tsconfig';

describe('diagnostics', () => {
  describe('expected diagnostics', () => {
    const file = ts.createSourceFile(
        'test.ts', '/* used for testing */', ts.ScriptTarget.Latest);
    function diag(code: number, messageText: string) {
      const category = ts.DiagnosticCategory.Error;
      return {file, code, messageText, start: 0, length: 0, category};
    }
    function filter(expectedDiagnostics: string[], diags: ts.Diagnostic[]) {
      const opts = {
        target: '//javascript/typescript/fake:target',
        expectedDiagnostics
      } as BazelOptions;
      return diagnostics.filterExpected(opts, diags)
          .map(d => `TS${d.code}:${d.messageText}`);
    }

    it('filters expected diagnostics', () => {
      expect(filter(['TS1234:very.*borked'], [
        diag(1234, 'the target is very badly borked'),
        diag(1234, 'the target is very sadly borked'),
      ])).toEqual([]);
    });

    it('returns unmatched expected diagnostics', () => {
      expect(filter(
                 ['TS1234:very.*borked', 'TS1234:not matching', 'TS1235:very'],
                 [diag(1234, 'the target is very badly borked')]))
          .toEqual([
            'TS1234:Expected a compilation error matching "TS1234:not matching"',
            'TS1235:Expected a compilation error matching "TS1235:very"',
          ]);
    });

    it('returns unmatched diagnostics', () => {
      expect(filter(
                 ['TS1234:very.*borked'],
                 [
                   diag(1234, 'the target is very badly borked'),
                   diag(5678, 'the target is very badly borked'),
                   diag(1234, 'text not matching'),
                 ]))
          .toEqual([
            'TS5678:the target is very badly borked',
            'TS1234:text not matching',
          ]);
    });

    it('throws when a charater is not escaped', () => {
      expect(() => filter(['TS1234:unescaped \n newline'], []))
          .toThrowError(
              'Incorrect expected error, did you forget character escapes in ' +
              'TS1234:unescaped \n newline');
    });

    it('handle negative diagnostic codes', () => {
      expect(filter(['TS-999:custom error'], [diag(-999, 'custom error')]))
          .toEqual([]);
    });
  });
});
