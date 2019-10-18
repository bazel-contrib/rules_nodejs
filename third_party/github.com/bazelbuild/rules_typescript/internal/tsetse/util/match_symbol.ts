import * as ts from 'typescript';
import {dealias, debugLog, isAmbientDeclaration, isDeclaration, isInStockLibraries, isPartOfImportStatement} from './ast_tools';

const JS_IDENTIFIER_FORMAT = '[\\w\\d_-]+';
const FQN_FORMAT = `(${JS_IDENTIFIER_FORMAT}\.)*${JS_IDENTIFIER_FORMAT}`;
// A fqn made out of a dot-separated chain of JS identifiers.
const ABSOLUTE_RE = new RegExp(`^${FQN_FORMAT}$`);

/**
 * This class matches symbols given a "foo.bar.baz" name, where none of the
 * steps are instances of classes.
 *
 * Note that this isn't smart about subclasses and types: to write a check, we
 * strongly suggest finding the expected symbol in externs to find the object
 * name on which the symbol was initially defined.
 *
 * TODO(rjamet): add a file-based optional filter, since FQNs tell you where
 * your imported symbols were initially defined. That would let us be more
 * specific in matches (say, you want to ban the fromLiteral in foo.ts but not
 * the one from bar.ts).
 */
export class AbsoluteMatcher {
  /**
   * From a "path/to/file.ts:foo.bar.baz" or "foo.bar.baz" matcher
   * specification, builds a Matcher.
   */
  constructor(readonly bannedName: string) {
    if (!bannedName.match(ABSOLUTE_RE)) {
      throw new Error('Malformed matcher selector.');
    }

    // JSConformance used to use a Foo.prototype.bar syntax for bar on
    // instances of Foo. TS doesn't surface the prototype part in the FQN, and
    // so you can't tell static `bar` on `foo` from the `bar` property/method
    // on `foo`. To avoid any confusion, throw there if we see `prototype` in
    // the spec: that way, it's obvious that you're not trying to match
    // properties.
    if (this.bannedName.match('.prototype.')) {
      throw new Error(
          'Your pattern includes a .prototype, but the AbsoluteMatcher is ' +
          'meant for non-object matches. Use the PropertyMatcher instead, or ' +
          'the Property-based PatternKinds.');
    }
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

    // Name-based check
    if (!(fqn.endsWith('.' + this.bannedName) || fqn === this.bannedName)) {
      debugLog(`FQN ${fqn} doesn't match name ${this.bannedName}`);
      return false;  // not a use of the symbols we want
    }

    // Check if it's part of a declaration or import. The check is cheap. If
    // we're looking for the uses of a symbol, we don't alert on the imports, to
    // avoid flooding users with warnings (as the actual use will be alerted)
    // and bad fixes.
    const p = n.parent;
    if (p && (isDeclaration(p) || isPartOfImportStatement(p))) {
      debugLog(`We don't flag symbol declarations`);
      return false;
    }

    // No file info in the FQN means it's not explicitly imported.
    // That must therefore be a local variable, or an ambient symbol
    // (and we only care about ambients here). Those could come from
    // either a declare somewhere, or one of the core libraries that
    // are loaded by default.
    if (!fqn.startsWith('"')) {
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
    const baseTypes = inspectedType.getBaseTypes() || [];
    return baseTypes.some(base => this.exactTypeMatches(base));
  }
}
