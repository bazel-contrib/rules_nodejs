import 'jasmine';

import * as crypto from 'crypto';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as ts from 'typescript';

import {Checker} from '../../checker';
import {Failure, fixToString} from '../../failure';
import {AbstractRule} from '../../rule';
import {Config} from '../pattern_config';



/**
 * Turns the provided source (as strings) into a ts.Program. The source files
 * will be named `.../file_${n}.ts`, with n the index of the source file in
 * the `sourceCode` array.
 */
export function compile(...sourceCode: string[]): ts.Program {
  const temporaryFolder = os.tmpdir() + path.sep +
      `tslint_test_input_${crypto.randomBytes(16).toString('hex')}`;
  const fullPaths: string[] = [];
  sourceCode.forEach((s, i) => {
    fullPaths.push(`${temporaryFolder}${path.sep}file_${i}.ts`);
  });

  let error: Error|undefined = undefined;
  let program: ts.Program|undefined = undefined;
  try {  // Wrap it all in a try/finally to clean up the temp files afterwards
    fs.mkdirSync(temporaryFolder);
    sourceCode.forEach((s, i) => {
      fs.writeFileSync(fullPaths[i], s);
    });
    program = ts.createProgram(fullPaths, {});
    if (ts.getPreEmitDiagnostics(program).length !== 0) {
      throw new Error(
          'Your program does not compile cleanly. Diagnostics:\n' +
          ts.formatDiagnostics(
              ts.getPreEmitDiagnostics(program), ts.createCompilerHost({})));
    }
  } catch (e) {
    error = e;
  } finally {
    fullPaths.forEach(p => fs.unlinkSync(p));
    fs.rmdirSync(temporaryFolder);
  }
  if (program && !error) {
    return program;
  } else {
    throw error;
  }
}

function check(rule: AbstractRule, program: ts.Program): Failure[] {
  const checker = new Checker(program);
  rule.register(checker);
  return program.getSourceFiles()
      .map(s => checker.execute(s))
      .reduce((prev, cur) => prev.concat(cur));
}

/** Builds and run the given Rule upon the source files that were provided. */
export function compileAndCheck(
    rule: AbstractRule, ...sourceCode: string[]): Failure[] {
  const program = compile(...sourceCode);
  return check(rule, program);
}

/** Turns a Failure to a fileName. */
export function toFileName(f: Failure) {
  const file = f.toDiagnostic().file;
  return file ? file.fileName : 'unknown';
}

export function getTempDirForWhitelist() {
  // TS uses forward slashes on Windows ¯\_(ツ)_/¯
  return os.platform() == 'win32' ? os.tmpdir().replace(/\\/g, '/') :
                                    os.tmpdir();
}

// Custom matcher for Jasmine, for a better experience matching fixes.
export const customMatchers: jasmine.CustomMatcherFactories = {

  toHaveNFailures(): jasmine.CustomMatcher {
    return {
      compare: (actual: Failure[], expected: Number, config?: Config<any>) => {
        if (actual.length === expected) {
          return {pass: true};
        } else {
          let message =
              `Expected ${expected} Failures, but found ${actual.length}.`;
          if (actual.length) {
            message += '\n' + actual.map(f => f.toString()).join('\n');
          }
          if (config) {
            message += `\nConfig: {kind:${config.kind}, values:${
                JSON.stringify(config.values)}, whitelist:${
                JSON.stringify(config.whitelistEntries)} }`;
          }
          return {pass: false, message};
        }
      }
    };
  },

  toBeFailureMatching(): jasmine.CustomMatcher {
    return {
      compare: (actualFailure: Failure, exp: {
        fileName?: string,
        start?: number,
        end?: number,
        matchedCode?: string,
        messageText?: string,
      }) => {
        const actualDiagnostic = actualFailure.toDiagnostic();
        let regrets = '';
        if (exp === undefined) {
          regrets += 'The matcher requires two arguments. ';
        }
        if (exp.fileName) {
          if (!actualDiagnostic.file) {
            regrets += `Expected diagnostic to have a source file, but it had ${
                actualDiagnostic.file}. `;
          } else if (!actualDiagnostic.file.fileName.endsWith(exp.fileName)) {
            regrets += `Expected ${
                actualDiagnostic.file.fileName} to end with ${exp.fileName}. `;
          }
        }
        if (exp.messageText !== undefined &&
            exp.messageText != actualDiagnostic.messageText) {
          regrets += expectation(
              'errorMessage', exp.messageText, actualDiagnostic.messageText);
        }
        if (exp.start !== undefined && actualDiagnostic.start !== exp.start) {
          regrets += expectation('start', exp.start, actualDiagnostic.start);
        }
        if (exp.end !== undefined && actualDiagnostic.end !== exp.end) {
          regrets += expectation('end', exp.end, actualDiagnostic.end);
        }
        if (exp.matchedCode) {
          if (!actualDiagnostic.file) {
            regrets += `Expected diagnostic to have a source file, but it had ${
                actualDiagnostic.file}. `;
          } else if (actualDiagnostic.start === undefined) {
            // I don't know how this could happen, but typings say so.
            regrets += `Expected diagnostic to have a starting position. `;
          } else {
            const foundMatchedCode = actualDiagnostic.file.getFullText().slice(
                Number(actualDiagnostic.start), actualDiagnostic.end);
            if (foundMatchedCode != exp.matchedCode) {
              regrets += `Expected diagnostic to match ${
                  exp.matchedCode}, but was ${foundMatchedCode} (from ${
                  Number(
                      actualDiagnostic.start)} to ${actualDiagnostic.end}). `;
            }
          }
        }
        return {pass: regrets === '', message: regrets};
      }
    };
  },

  /** Checks that a Failure has the expected Fix field. */
  toHaveFixMatching(): jasmine.CustomMatcher {
    return {
      compare: (actualFailure: Failure, exp: [{
                  fileName?: string,
                  start?: number,
                  end?: number,
                  replacement?: string
                }]) => {
        let regrets = '';
        const actualFix = actualFailure.toDiagnostic().fix;
        if (!actualFix) {
          regrets += `Expected ${actualFailure.toString()} to have fix ${
              JSON.stringify(exp)}. `;
        } else if (actualFix.changes.length != exp.length) {
          regrets += `Expected ${exp.length} individual changes, got ${
              actualFix.changes.length}. `;
          if (actualFix.changes.length) {
            regrets += '\n' + fixToString(actualFix);
          }
        } else {
          for (let i = 0; i < exp.length; i++) {
            const e = exp[i];
            const a = actualFix.changes[i];
            if (e.start !== undefined && e.start !== a.start) {
              regrets += expectation(
                  `${i}th individualChange's start`, e.start, a.start);
            }
            if (e.end !== undefined && e.end !== a.end) {
              regrets +=
                  expectation(`${i}th individualChange's end`, e.end, a.end);
            }
            if (e.replacement !== undefined &&
                e.replacement !== a.replacement) {
              regrets += expectation(
                  `${i}th individualChange's replacement`, e.replacement,
                  a.replacement);
            }
            if (e.fileName !== undefined &&
                e.fileName !== a.sourceFile.fileName) {
              regrets += expectation(
                  `${i}th individualChange's fileName`, e.fileName,
                  a.sourceFile.fileName);
            }
            // TODO: Consider adding matchedCode as for the failure matcher.
          }
        }

        return {pass: regrets === '', message: regrets};
      }
    };
  }
};

function expectation(fieldname: string, expectation: any, actual: any) {
  return `Expected .${fieldname} to be ${expectation}, was ${actual}. `;
}

// And the matching type
declare global {
  namespace jasmine {
    interface Matchers<T> {
      toBeFailureMatching(expected: {
        fileName?: string,
        start?: number,
        end?: number,
        matchedCode?: string,
        messageText?: string,
      }): void;

      toHaveFixMatching(expected: [
        {fileName?: string, start?: number, end?: number, replacement?: string}
      ]): void;

      toHaveNFailures(expected: Number, config?: Config<any>): void;
    }
  }
}
