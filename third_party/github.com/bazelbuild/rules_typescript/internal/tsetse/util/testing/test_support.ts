import 'jasmine';

import * as crypto from 'crypto';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as ts from 'typescript';

import {Checker} from '../../checker';
import {Failure, fixToString} from '../../failure';
import {AbstractRule} from '../../rule';



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

/**
 * Returns the location the temp directory for that platform (with forward
 * slashes).
 */
export function getTempDirForAllowlist() {
  // TS uses forward slashes on Windows ¯\_(ツ)_/¯
  return os.platform() === 'win32' ? os.tmpdir() : os.tmpdir();
}

interface FailureExpectations {
  fileName?: string;
  start?: number;
  end?: number;
  matchedCode?: string;
  messageText?: string;
  fix?: FixExpectations;
}

type FixExpectations = Array<
    {fileName?: string; start?: number; end?: number; replacement?: string;}>;


function failureMatchesExpectation(
    f1: Failure, exp: FailureExpectations): {pass: boolean, message: string} {
  const diagnostic = f1.toDiagnostic();
  let regrets = '';
  if (exp === undefined) {
    regrets += 'The matcher requires two arguments. ';
  }
  if (exp.fileName) {
    if (!diagnostic.file) {
      regrets += `Expected diagnostic to have a source file, but it had ${
          diagnostic.file}. `;
    } else if (!diagnostic.file.fileName.endsWith(exp.fileName)) {
      regrets +=
          `Expected ${diagnostic.file.fileName} to end with ${exp.fileName}. `;
    }
  }
  if (exp.messageText !== undefined &&
      exp.messageText !== diagnostic.messageText) {
    regrets +=
        expectation('errorMessage', exp.messageText, diagnostic.messageText);
  }
  if (exp.start !== undefined && diagnostic.start !== exp.start) {
    regrets += expectation('start', exp.start, diagnostic.start);
  }
  if (exp.end !== undefined && diagnostic.end !== exp.end) {
    regrets += expectation('end', exp.end, diagnostic.end);
  }
  if (exp.matchedCode) {
    if (!diagnostic.file) {
      regrets += `Expected diagnostic to have a source file, but it had ${
          diagnostic.file}. `;
    } else if (diagnostic.start === undefined) {
      // I don't know how this could happen, but typings say so.
      regrets += `Expected diagnostic to have a starting position. `;
    } else {
      const foundMatchedCode = diagnostic.file.getFullText().slice(
          Number(diagnostic.start), diagnostic.end);
      if (foundMatchedCode !== exp.matchedCode) {
        regrets += `Expected diagnostic to match ${exp.matchedCode}, but was ${
            foundMatchedCode} (from ${Number(diagnostic.start)} to ${
            diagnostic.end}). `;
      }
    }
  }
  if (exp.fix) {
    const {pass, message: fixMessage} = fixMatchesExpectation(f1, exp.fix);
    if (!pass) {
      regrets += fixMessage;
    }
  }
  return {pass: regrets === '', message: regrets};
}

function fixMatchesExpectation(failure: Failure, expected: FixExpectations):
    {pass: boolean, message: string} {
  let regrets = '';
  const actualFix = failure.toDiagnostic().fix;
  if (!actualFix) {
    regrets += `Expected ${failure.toString()} to have fix ${
        JSON.stringify(expected)}. `;
  } else if (actualFix.changes.length !== expected.length) {
    regrets += `Expected ${expected.length} individual changes, got ${
        actualFix.changes.length}. `;
    if (actualFix.changes.length) {
      regrets += '\n' + fixToString(actualFix);
    }
  } else {
    for (let i = 0; i < expected.length; i++) {
      const e = expected[i];
      const a = actualFix.changes[i];
      if (e.start !== undefined && e.start !== a.start) {
        regrets +=
            expectation(`${i}th individualChange's start`, e.start, a.start);
      }
      if (e.end !== undefined && e.end !== a.end) {
        regrets += expectation(`${i}th individualChange's end`, e.end, a.end);
      }
      if (e.replacement !== undefined && e.replacement !== a.replacement) {
        regrets += expectation(
            `${i}th individualChange's replacement`, e.replacement,
            a.replacement);
      }
      if (e.fileName !== undefined && e.fileName !== a.sourceFile.fileName) {
        regrets += expectation(
            `${i}th individualChange's fileName`, e.fileName,
            a.sourceFile.fileName);
      }
    }
  }

  return {pass: regrets === '', message: regrets};
}


/**
 * Custom matcher for Jasmine, for a better experience matching failures and
 * fixes.
 */
export const customMatchers: jasmine.CustomMatcherFactories = {

  toBeFailureMatching(): jasmine.CustomMatcher {
    return {compare: failureMatchesExpectation};
  },

  /** Checks that a Failure has the expected Fix field. */
  toHaveFixMatching(): jasmine.CustomMatcher {
    return {compare: fixMatchesExpectation};
  },

  toHaveNFailures(): jasmine.CustomMatcher {
    return {
      compare: (actual: Failure[], expected: number) => {
        if (actual.length === expected) {
          return {pass: true};
        } else {
          let message =
              `Expected ${expected} Failures, but found ${actual.length}.`;
          if (actual.length) {
            message += '\n' + actual.map(f => f.toString()).join('\n');
          }
          return {pass: false, message};
        }
      }
    };
  },

  toHaveFailuresMatching(): jasmine.CustomMatcher {
    return {
      compare: (actual: Failure[], ...expected: FailureExpectations[]) => {
        if (actual.length !== expected.length) {
          let message =
              `Expected ${expected} Failures, but found ${actual.length}.`;
          if (actual.length) {
            message += '\n' + actual.map(f => f.toString()).join('\n');
          }
          return {pass: false, message};
        }
        let pass = true, message = '';
        for (let i = 0; i < actual.length; i++) {
          const comparison = failureMatchesExpectation(actual[i], expected[i]);
          pass = pass && comparison.pass;
          if (comparison.message) {
            message += `For failure ${i}: ${comparison.message}\n`;
          }
          message += comparison.message;
        }
        return {pass, message};
      }
    };
  },

  /**
   * Asserts that a Failure has no fix.
   */
  toHaveNoFix(): jasmine.CustomMatcher {
    return {
      compare: (actualFailure: Failure) => {
        return {
          pass: actualFailure.toDiagnostic().fix === undefined,
          message: 'This failure should not have a fix.'
        };
      }
    };
  },

  toHaveNoFailures(): jasmine.CustomMatcher {
    return {
      compare: (actual: Failure[]) => {
        if (actual.length !== 0) {
          let message = `Expected no Failures, but found ${actual.length}.`;
          message += '\n' + actual.map(f => f.toString()).join('\n');
          return {pass: false, message};
        }
        return {pass: true, message: ''};
      }
    };
  }
};

function expectation<T>(fieldname: string, expectation: T, actual: T) {
  return `Expected .${fieldname} to be ${expectation}, was ${actual}. `;
}

// And the matching type
declare global {
  namespace jasmine {
    interface Matchers<T> {
      toBeFailureMatching(expected: FailureExpectations): void;


      /** Checks that a Failure has the expected Fix field. */
      toHaveFixMatching(expected: FixExpectations): void;

      /** Asserts that a Failure has no fix. */
      toHaveNoFix(): void;

      toHaveNFailures(expected: number): void;

      toHaveFailuresMatching(...expected: FailureExpectations[]): void;

      /** Asserts that the results are empty. */
      toHaveNoFailures(): void;
    }
  }
}
