import * as ts from 'typescript';
import {dealias, debugLog, isAmbientDeclaration, isInStockLibraries, isNameInDeclaration, isPartOfImportStatement} from './ast_tools';

const PATH_NAME_FORMAT = '[/\\.\\w\\d_-]+';
const JS_IDENTIFIER_FORMAT = '[\\w\\d_-]+';
const FQN_FORMAT = `(${JS_IDENTIFIER_FORMAT}\.)*${JS_IDENTIFIER_FORMAT}`;
// A fqn made out of a dot-separated chain of JS identifiers.
const ABSOLUTE_RE = new RegExp(`^${PATH_NAME_FORMAT}\\|${FQN_FORMAT}$`);
const GLOBAL = 'GLOBAL';
const ANY_SYMBOL = 'ANY_SYMBOL';


/**
 * This class matches symbols given a "foo.bar.baz" name, where none of the
 * steps are instances of classes.
 *
 * Note that this isn't smart about subclasses and types: to write a check, we
 * strongly suggest finding the expected symbol in externs to find the object
 * name on which the symbol was initially defined.
 *
 * This matcher requires a scope for the symbol, which may be `GLOBAL`,
 * `ANY_SCOPE`, or a file path filter. The matcher begins with this scope, then
 * the separator "|", followed by the symbol name. For example, "GLOBAL|eval".
 *
 * The file filter specifies
 * (part of) the path of the file in which the symbol of interest is defined.
 * For example, "path/to/file.ts|foo.bar.baz".
 * With this filter, only symbols named "foo.bar.baz" that are defined in a path
 * that contains "path/to/file.ts" are matched.
 *
 * This filter is useful when mutiple symbols have the same name but
 * you want to match with a specific one. For example, assume that there are
 * two classes named "Foo" defined in /path/to/file0 and /path/to/file1.
 * // in /path/to/file0
 * export class Foo { static bar() {return "Foo.bar in file0";} }
 *
 * // in /path/to/file1
 * export class Foo { static bar() {return "Foo.bar in file1";} }
 *
 * Suppose that these two classes are referenced in two other files.
 * // in /path/to/file2
 * import {Foo} from /path/to/file0;
 * Foo.bar();
 *
 * // in /path/to/file3
 * import {Foo} from /path/to/file1;
 * Foo.bar();
 *
 * An absolute matcher "Foo.bar" without a file filter will match with both
 * references to "Foo.bar" in /path/to/file2 and /path/to/file3.
 * An absolute matcher "/path/to/file1|Foo.bar", however, only matches with the
 * "Foo.bar()" in /path/to/file3 because that references the "Foo.bar" defined
 * in /path/to/file1.
 *
 * Note that an absolute matcher will match with any reference to the symbol
 * defined in the file(s) specified by the file filter. For example, assume that
 * Foo from file1 is extended in file4.
 *
 * // in /path/to/file4
 * import {Foo} from /path/to/file1;
 * class Moo { static tar() {return "Moo.tar in file4";} }
 * Moo.bar();
 *
 * An absolute matcher "/path/to/file1|Foo.bar" matches with "Moo.bar()" because
 * "bar" is defined as part of Foo in /path/to/file1.
 */
export class AbsoluteMatcher {
  /**
   * From a "path/to/file.ts|foo.bar.baz", builds a Matcher.
   */
  readonly filePath: string;
  readonly bannedName: string;

  constructor(spec: string) {
    if (!spec.match(ABSOLUTE_RE)) {
      throw new Error('Malformed matcher selector.');
    }

    // JSConformance used to use a Foo.prototype.bar syntax for bar on
    // instances of Foo. TS doesn't surface the prototype part in the FQN, and
    // so you can't tell static `bar` on `foo` from the `bar` property/method
    // on `foo`. To avoid any confusion, throw there if we see `prototype` in
    // the spec: that way, it's obvious that you're not trying to match
    // properties.
    if (spec.match('.prototype.')) {
      throw new Error(
          'Your pattern includes a .prototype, but the AbsoluteMatcher is ' +
          'meant for non-object matches. Use the PropertyMatcher instead, or ' +
          'the Property-based PatternKinds.');
    }

    // Split spec by the separator "|".
    [this.filePath, this.bannedName] = spec.split('|', 2);
  }

  matches(n: ts.Node, tc: ts.TypeChecker): boolean {
    // Get the symbol (or the one at the other end of this alias) that we're
    // looking at.
    const s = dealias(tc.getSymbolAtLocation(n), tc);
    if (!s) {
      debugLog(`cannot get symbol`);
      return false;
    }

    // The TS-provided FQN tells us the full identifier, and the origin file
    // in some circumstances.
    const fqn = tc.getFullyQualifiedName(s);
    debugLog(`got FQN ${fqn}`);

    // Name-based check: `getFullyQualifiedName` returns `"filename".foo.bar` or
    // just `foo.bar` if the symbol is ambient. The check here should consider
    // both cases.
    if (!(fqn.endsWith('".' + this.bannedName) || fqn === this.bannedName)) {
      debugLog(`FQN ${fqn} doesn't match name ${this.bannedName}`);
      return false;  // not a use of the symbols we want
    }

    // Check if it's part of a declaration or import. The check is cheap. If
    // we're looking for the uses of a symbol, we don't alert on the imports, to
    // avoid flooding users with warnings (as the actual use will be alerted)
    // and bad fixes.
    const p = n.parent;
    if (isNameInDeclaration(n) || (p && isPartOfImportStatement(p))) {
      debugLog(`We don't flag symbol declarations`);
      return false;
    }

    // No file info in the FQN means it's not explicitly imported.
    // That must therefore be a local variable, or an ambient symbol
    // (and we only care about ambients here). Those could come from
    // either a declare somewhere, or one of the core libraries that
    // are loaded by default.
    if (!fqn.startsWith('"')) {
      // If this matcher includes a non-empty file path, it means that the
      // targeted symbol is defined and explicitly exported in some file. If the
      // current symbol is not associated with a specific file (because it is a
      // local symbol or ambient symbol), it is not a match.
      if (this.filePath !== GLOBAL && this.filePath !== ANY_SYMBOL) {
        debugLog(
            `The symbol has no file path and one is specified by the ` +
            `matcher`);
        return false;
      }

      // We need to trace things back, so get declarations of the symbol.
      const declarations = s.getDeclarations();
      if (!declarations) {
        debugLog(`Symbol never declared?`);
        return false;
      }
      if (!declarations.some(isAmbientDeclaration) &&
          !declarations.some(isInStockLibraries)) {
        debugLog(`Symbol neither ambient nor from the stock libraries`);
        return false;
      }
    }
    // If we know the file info of the symbol, and this matcher includes a file
    // path, we check if they match.
    else {
      if (this.filePath !== ANY_SYMBOL) {
        const last = fqn.indexOf('"', 1);
        if (last === -1) {
          throw new Error('Malformed fully-qualified name.');
        }
        const sympath = fqn.substring(1, last);
        debugLog(`The file path of the symbol is ${sympath}`);
        if (!sympath.match(this.filePath) || this.filePath === GLOBAL) {
          debugLog(
              `The file path of the symbol does not match the ` +
              `file path of the matcher`);
          return false;
        }
      }
    }

    debugLog(`all clear, report finding`);
    return true;
  }
}

// TODO: Export the matched node kinds here.
/**
 * This class matches a property access node, based on a property holder type
 * (through its name), i.e. a class, and a property name.
 *
 * The logic is voluntarily simple: if a matcher for `a.b` tests a `x.y` node,
 * it will return true if:
 * - `x` is of type `a` either directly (name-based) or through inheritance
 *   (ditto),
 * - and, textually, `y` === `b`.
 *
 * Note that the logic is different from TS's type system: this matcher doesn't
 * have any knowledge of structural typing.
 */
export class PropertyMatcher {
  static fromSpec(spec: string): PropertyMatcher {
    if (spec.indexOf('.prototype.') === -1) {
      throw new Error(`BANNED_PROPERTY expects a .prototype in your query.`);
    }
    const requestParser = /^([\w\d_.-]+)\.prototype\.([\w\d_.-]+)$/;
    const matches = requestParser.exec(spec);
    if (!matches) {
      throw new Error('Cannot understand the BannedProperty spec' + spec);
    }
    const [bannedType, bannedProperty] = matches.slice(1);
    return new PropertyMatcher(bannedType, bannedProperty);
  }

  constructor(readonly bannedType: string, readonly bannedProperty: string) {}

  /**
   * @param n The PropertyAccessExpression we're looking at.
   */
  matches(n: ts.PropertyAccessExpression, tc: ts.TypeChecker) {
    return n.name.text === this.bannedProperty &&
        this.typeMatches(tc.getTypeAtLocation(n.expression));
  }

  private exactTypeMatches(inspectedType: ts.Type): boolean {
    const typeSymbol = inspectedType.getSymbol() || false;
    return typeSymbol && typeSymbol.getName() === this.bannedType;
  }

  // TODO: Account for unknown types/ '?', and 'loose type matches', i.e. if the
  // actual type is a supertype of the prohibited type.
  private typeMatches(inspectedType: ts.Type): boolean {
    if (this.exactTypeMatches(inspectedType)) {
      return true;
    }
    // If the type is an intersection/union, check if any of the component matches
    if (inspectedType.isUnionOrIntersection()) {
      return inspectedType.types.some(comp => this.typeMatches(comp));
    }

    const baseTypes = inspectedType.getBaseTypes() || [];
    return baseTypes.some(base => this.exactTypeMatches(base));
  }
}
