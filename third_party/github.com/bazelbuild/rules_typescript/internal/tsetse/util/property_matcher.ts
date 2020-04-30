import * as ts from 'typescript';

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
