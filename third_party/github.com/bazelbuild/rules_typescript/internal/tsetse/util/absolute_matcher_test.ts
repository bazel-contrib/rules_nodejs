import 'jasmine';
import {ConformancePatternRule, PatternKind} from '../rules/conformance_pattern_rule';
import {compileAndCheck, customMatchers} from './testing/test_support';

describe('AbsoluteMatcher', () => {
  beforeEach(() => {
    jasmine.addMatchers(customMatchers);
  });

  it('requires a matcher scope', () => {
    const config = {
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

    it('ignores an unmatched file path', () => {
      const config = {
        errorMessage: 'banned name with file path',
        kind: PatternKind.BANNED_NAME,
        values: ['./file_0|Foo.bar']
      };
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

    it('matches a local exported definition', () => {
      // This is a match because Foo.bar is an exported symbol.
      const config = {
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
  });

  describe('global scope', () => {
    it('matches an in-stock library method', () => {
      const config = {
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

    it('does not match a custom method with the same name', () => {
      const config = {
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

    it('matches an initializer in a named declaration', () => {
      const config = {
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

    it('does not match a local non-exported definition', () => {
      // This is not a match because Foo.bar is a non-exported locally defined
      // symbol.
      const config = {
        errorMessage: 'banned name with file path',
        kind: PatternKind.BANNED_NAME,
        values: ['./file_0|Foo.bar']
      };
      const sources = [`class Foo { static bar(s: string) {return s + "abc";} }
                        var a = Foo.bar("123");`];
      const results =
          compileAndCheck(new ConformancePatternRule(config), ...sources);
      expect(results).toHaveNoFailures();
    });
  });

  describe('properties', () => {
    it('matches a static property', () => {
      const config = {
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
