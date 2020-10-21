import 'jasmine';
import {ConformancePatternRule, ErrorCode, PatternKind} from '../rules/conformance_pattern_rule';
import {compileAndCheck, customMatchers} from './testing/test_support';

describe('AbsoluteMatcher', () => {
  beforeEach(() => {
    jasmine.addMatchers(customMatchers);
  });

  it('requires a matcher scope', () => {
    const config = {
      errorCode: ErrorCode.CONFORMANCE_PATTERN,
      errorMessage: 'banned name with no scope',
      kind: PatternKind.BANNED_NAME,
      values: ['exec']
    };
    const sources = [`eval('alert("hi");');`];

    const check = () =>
        compileAndCheck(new ConformancePatternRule(config), ...sources);

    expect(check).toThrowError('Malformed matcher selector.');
  });

  describe('file scope', () => {
    it('matches a file path', () => {
      const config = {
        errorCode: ErrorCode.CONFORMANCE_PATTERN,
        errorMessage: 'banned name with file path',
        kind: PatternKind.BANNED_NAME,
        values: ['./file_0|Foo.bar']
      };
      const sources = [
        `export class Foo { static bar(s: string) {return s + "abc";} }`,
        `import {Foo} from './file_0';
         var a = Foo.bar("123");`
      ];
      const results =
          compileAndCheck(new ConformancePatternRule(config), ...sources);

      expect(results).toHaveFailuresMatching(
          {matchedCode: `bar`, messageText: 'banned name with file path'});
    });

    it('ignores an exported symbol defined in an unmatched file path', () => {
      const config = {
        errorCode: ErrorCode.CONFORMANCE_PATTERN,
        errorMessage: 'banned name with file path',
        kind: PatternKind.BANNED_NAME,
        values: ['./file_0|Foo.bar']
      };

      // test exported symbols
      const sources = [
        `export class Foo { static bar(s: string) {return s + "abc";} }`,
        `export class Foo { static bar(s: string) {return s + "abc";} }`,
        `import {Foo} from './file_1';
         var a = Foo.bar("123");`
      ];

      const results =
          compileAndCheck(new ConformancePatternRule(config), ...sources);
      expect(results).toHaveNoFailures();
    });

    it('ignores an un-exported symbol defined in an unmatched file path',
       () => {
         const config = {
           errorCode: ErrorCode.CONFORMANCE_PATTERN,
           errorMessage: 'banned name with file path',
           kind: PatternKind.BANNED_NAME,
           values: ['./file_0|Foo.bar']
         };

         // test non-exported symbols
         const sources = [
           `export class Foo { static bar(s: string) {return s + "abc";} }`,
           `class Foo { static bar(s: string) {return s + "abc";} }
         var a = Foo.bar("123");`
         ];

         const results =
             compileAndCheck(new ConformancePatternRule(config), ...sources);

         expect(results).toHaveNoFailures();
       });

    it('matches a local exported definition', () => {
      // This is a match because Foo.bar is an exported symbol.
      const config = {
        errorCode: ErrorCode.CONFORMANCE_PATTERN,
        errorMessage: 'banned name with file path',
        kind: PatternKind.BANNED_NAME,
        values: ['./file_0|Foo.bar']
      };
      const sources =
          [`export class Foo { static bar(s: string) {return s + "abc";} }
            var a = Foo.bar("123");`];

      const results =
          compileAndCheck(new ConformancePatternRule(config), ...sources);
      expect(results).toHaveFailuresMatching(
          {matchedCode: `bar`, messageText: 'banned name with file path'});
    });

    it('matches names in import statement', () => {
      const config = {
        errorCode: ErrorCode.CONFORMANCE_PATTERN,
        errorMessage: 'banned name with file path',
        kind: PatternKind.BANNED_NAME,
        values: ['./file_0|foo', 'ANY_SYMBOL|bar']
      };
      const sources = [
        `export function foo(s: string) {return s + "abc";}
         function bar() {}
         export {bar};`,
        `import {foo} from './file_0';
         import {bar} from './file_0';`,
        `import {foo as okFoo} from './file_0';
         import {bar as okBar} from './file_0';`,
      ];

      const results =
          compileAndCheck(new ConformancePatternRule(config), ...sources);
      expect(results).toHaveFailuresMatching(
          {matchedCode: `foo`, messageText: 'banned name with file path'},
          {matchedCode: `bar`, messageText: 'banned name with file path'},
      );
    });
  });

  describe('global scope', () => {
    it('matches an in-stock library method', () => {
      const config = {
        errorCode: ErrorCode.CONFORMANCE_PATTERN,
        errorMessage: 'banned ambient name',
        kind: PatternKind.BANNED_NAME,
        values: ['GLOBAL|eval']
      };
      const sources = [`eval('alert("hi");');`];

      const results =
          compileAndCheck(new ConformancePatternRule(config), ...sources);
      expect(results).toHaveFailuresMatching(
          {matchedCode: `eval`, messageText: 'banned ambient name'});
    });

    it('does not match a custom exported method with the same name', () => {
      const config = {
        errorCode: ErrorCode.CONFORMANCE_PATTERN,
        errorMessage: 'banned ambient name',
        kind: PatternKind.BANNED_NAME,
        values: ['GLOBAL|eval']
      };
      const sources =
          [`export class Foo { static eval(s: string) { return s + "abc";} }
            var a = Foo.eval("123");`];

      const results =
          compileAndCheck(new ConformancePatternRule(config), ...sources);
      expect(results).toHaveNoFailures();
    });

    it('does not match a custom non-exported method with the same name', () => {
      const config = {
        errorCode: ErrorCode.CONFORMANCE_PATTERN,
        errorMessage: 'banned global name',
        kind: PatternKind.BANNED_NAME,
        values: ['GLOBAL|Foo.bar']
      };
      const sources = [`class Foo { static bar(s: string) {return s + "abc";} }
                        var a = Foo.bar("123");`];
      const results =
          compileAndCheck(new ConformancePatternRule(config), ...sources);
      expect(results).toHaveNoFailures();
    });

    it('matches an initializer in a named declaration', () => {
      const config = {
        errorCode: ErrorCode.CONFORMANCE_PATTERN,
        errorMessage: 'banned ambient name',
        kind: PatternKind.BANNED_NAME,
        values: ['GLOBAL|open'],
      };
      const sources = ['const op = open;'];

      const results =
          compileAndCheck(new ConformancePatternRule(config), ...sources);
      expect(results).toHaveFailuresMatching(
          {matchedCode: 'open', messageText: 'banned ambient name'});
    });
  });

  describe('properties', () => {
    it('matches a static property', () => {
      const config = {
        errorCode: ErrorCode.CONFORMANCE_PATTERN,
        errorMessage: 'banned name with file path',
        kind: PatternKind.BANNED_NAME,
        values: ['./file_0|Foo.s']
      };
      const sources = [
        `export class Foo { static s : string; }`,
        `import {Foo} from './file_0';
         var a = Foo.s;`,
      ];

      const results =
          compileAndCheck(new ConformancePatternRule(config), ...sources);
      expect(results).toHaveFailuresMatching(
          {matchedCode: `s`, messageText: 'banned name with file path'});
    });

    it('does not match a property with a name overlapping an in-stock library',
       () => {
         const config = {
           errorCode: ErrorCode.CONFORMANCE_PATTERN,
           errorMessage: 'banned name without file path',
           kind: PatternKind.BANNED_NAME,
           values: ['GLOBAL|open']
         };
         const sources = [
           'const elem = new XMLHttpRequest();',
           'elem.open("get", "url");',  // FQN of elem.open is
                                        // XMLHttpRequest.open and shouldn't be
                                        // banned
         ];

         const results =
             compileAndCheck(new ConformancePatternRule(config), ...sources);
         expect(results).toHaveNoFailures();
       });
  });

  describe('inheritance', () => {
    it('matches an inherited static property', () => {
      // This is a match because Moo inherits s from Foo.
      const config = {
        errorCode: ErrorCode.CONFORMANCE_PATTERN,
        errorMessage: 'banned name with file path',
        kind: PatternKind.BANNED_NAME,
        values: ['./file_0|Foo.s']
      };
      const sources = [
        `export class Foo { static s : string; }`,
        `import {Foo} from './file_0';
         export class Moo extends Foo { static t : string; }`,
        `import {Moo} from './file_1';
         var a = Moo.s;`,
      ];

      const results =
          compileAndCheck(new ConformancePatternRule(config), ...sources);
      expect(results).toHaveFailuresMatching(
          {matchedCode: `s`, messageText: 'banned name with file path'});
    });

    it('matches an inherited static method', () => {
      // This is a match because Moo inherits bar from Foo.
      const config = {
        errorCode: ErrorCode.CONFORMANCE_PATTERN,
        errorMessage: 'banned name with file path',
        kind: PatternKind.BANNED_NAME,
        values: ['./file_0|Foo.bar']
      };
      const sources = [
        `export class Foo { static bar(s: string) {return s + "abc";} }`,
        `import {Foo} from './file_0';
         export class Moo extends Foo { static far(s: string) {return s + "def";} }`,
        `import {Moo} from './file_1';
         Moo.bar("abc");`
      ];

      const results =
          compileAndCheck(new ConformancePatternRule(config), ...sources);
      expect(results).toHaveFailuresMatching(
          {matchedCode: `bar`, messageText: 'banned name with file path'});
    });

    it('does not match a redefined inherited static property', () => {
      // This is not a match because Moo redefines s.
      const config = {
        errorCode: ErrorCode.CONFORMANCE_PATTERN,
        errorMessage: 'banned name with file path',
        kind: PatternKind.BANNED_NAME,
        values: ['./file_0|Foo.s']
      };
      const sources = [
        `export class Foo { static s : string; }`,
        `import {Foo} from './file_0';
         export class Moo extends Foo { static s : string; }`,
        `import {Moo} from './file_1';
         var a = Moo.s;`,
      ];

      const results =
          compileAndCheck(new ConformancePatternRule(config), ...sources);
      expect(results).toHaveNoFailures();
    });

    it('does not match a redefined inherited static method', () => {
      // This is not a match because Moo redefines bar.
      const config = {
        errorCode: ErrorCode.CONFORMANCE_PATTERN,
        errorMessage: 'banned name with file path',
        kind: PatternKind.BANNED_NAME,
        values: ['./file_0|Foo.bar']
      };
      const sources = [
        `export class Foo { static bar(s: string) {return s + "abc";} }
         export class Moo extends Foo { static bar(s: string) {return s + "def";} }`,
        `import {Foo, Moo} from './file_0';
         Moo.bar("abc");`
      ];

      const results =
          compileAndCheck(new ConformancePatternRule(config), ...sources);
      expect(results).toHaveNoFailures();
    });

    it('does not match an interface\'s static method', () => {
      // This is not a match because even though bar specified is interface Moo,
      // its actual definition is in class Boo.
      const config = {
        errorCode: ErrorCode.CONFORMANCE_PATTERN,
        errorMessage: 'banned name with file path',
        kind: PatternKind.BANNED_NAME,
        values: ['./file_1|Moo.bar']
      };
      const sources = [
        `export class Foo { static bar(s: string) {return s + "abc";} }`,
        `import {Foo} from './file_0';
         export interface Moo extends Foo { }`,
        `import {Moo} from './file_1';
         export class Boo implements Moo { static bar(s: string) {return s + "def";} }`,
        `import {Boo} from './file_2';
         Boo.bar("abc");`,
      ];

      const results =
          compileAndCheck(new ConformancePatternRule(config), ...sources);
      expect(results).toHaveNoFailures();
    });
  });
});
