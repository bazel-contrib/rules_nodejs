import 'jasmine';
import {ConformancePatternRule, ErrorCode, PatternKind} from '../rules/conformance_pattern_rule';
import {compileAndCheck, customMatchers} from './testing/test_support';

describe('PropertyMatcher', () => {
  beforeEach(() => {
    jasmine.addMatchers(customMatchers);
  });

  it('matches simple property access on dom properties', () => {
    const config = {
      errorCode: ErrorCode.CONFORMANCE_PATTERN,
      errorMessage: 'No Location#href access',
      kind: PatternKind.BANNED_PROPERTY,
      values: ['Location.prototype.href'],
    };
    const source = 'const href = location.href;';
    const results = compileAndCheck(new ConformancePatternRule(config), source);

    expect(results).toHaveFailuresMatching({
      matchedCode: 'location.href',
      messageText: 'No Location#href access',
    });
  });

  it('matches simple property access on properties of TS built-in types',
     () => {
       const config = {
         errorCode: ErrorCode.CONFORMANCE_PATTERN,
         errorMessage: 'No Array#map access',
         kind: PatternKind.BANNED_PROPERTY,
         values: ['Array.prototype.map'],
       };
       const source = '[].map(() => 1);';

       const results =
           compileAndCheck(new ConformancePatternRule(config), source);

       expect(results).toHaveFailuresMatching({
         matchedCode: '[].map',
         messageText: 'No Array#map access',
       });
     });

  it('matches simple property access on properties of user-defined global types',
     () => {
       const config = {
         errorCode: ErrorCode.CONFORMANCE_PATTERN,
         errorMessage: 'No Ty#foo access',
         kind: PatternKind.BANNED_PROPERTY,
         values: ['Ty.prototype.foo'],
       };
       const funcPropAccess = `class Ty {
             foo() {}
             bar: number = 1;
         }
         new Ty().foo();
        `;
       let results =
           compileAndCheck(new ConformancePatternRule(config), funcPropAccess);

       expect(results).toHaveFailuresMatching({
         matchedCode: 'new Ty().foo',
         messageText: 'No Ty#foo access',
       });

       const nonFuncPropAccess = `class Ty {
             foo: number = 1;
             bar() {}
         }
         new Ty().foo;
        `;
       results = compileAndCheck(
           new ConformancePatternRule(config), nonFuncPropAccess);

       expect(results).toHaveFailuresMatching({
         matchedCode: 'new Ty().foo',
         messageText: 'No Ty#foo access',
       });
     });

  it('matches property on indirect base types', () => {
    const config = {
      errorCode: ErrorCode.CONFORMANCE_PATTERN,
      errorMessage: 'No Element#innerHTML access',
      kind: PatternKind.BANNED_PROPERTY_WRITE,
      values: ['Element.prototype.innerHTML'],
    };
    // Element is an indirect base of HTMLDivElement (HTMLDivElement extends
    // HTMLElement, which extends Element).
    const proprAcessOnIndirectBaseType =
        `declare var div: HTMLDivElement; div.innerHTML = 'foo'`;

    const results = compileAndCheck(
        new ConformancePatternRule(config), proprAcessOnIndirectBaseType);

    expect(results).toHaveFailuresMatching({
      matchedCode: `div.innerHTML = 'foo'`,
      messageText: 'No Element#innerHTML access',
    });
  });

  it('does not match in-module defined type', () => {
    const config = {
      errorCode: ErrorCode.CONFORMANCE_PATTERN,
      errorMessage: 'No Location#replace access',
      kind: PatternKind.BANNED_PROPERTY,
      values: ['Location.prototype.location'],
    };
    const source = `export {}; // export makes the file a module
        class Location { replace(x: string) {} }
        new Location().replace('a');`;
    const results = compileAndCheck(new ConformancePatternRule(config), source);

    expect(results).toHaveNoFailures();
  });

  it('does not match properties after fancy type casts', () => {
    const config = {
      errorCode: ErrorCode.CONFORMANCE_PATTERN,
      errorMessage: 'No Location#href access',
      kind: PatternKind.BANNED_PROPERTY,
      values: ['Location.prototype.replace'],
    };
    const source = [
      // Grey area of tests that don't trigger, but probably could
      '(location as unknown as {replace: (url: string) => void}).replace(\'\');',
      // We don't trigger on any, since it's not the right type.
      'const locationAsAny: any = location;',
      'locationAsAny.replace(\'https://example.com/script.js\');',
    ];
    const results =
        compileAndCheck(new ConformancePatternRule(config), ...source);

    expect(results).toHaveNoFailures();
  });
});
