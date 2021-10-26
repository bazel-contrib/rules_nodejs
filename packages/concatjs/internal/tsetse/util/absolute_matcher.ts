import * as ts from 'typescript';
import {dealias, debugLog, isInStockLibraries, isNameInDeclaration, isPartOfImportStatement} from './ast_tools';

const PATH_NAME_FORMAT = '[/\\.\\w\\d_-]+';
const JS_IDENTIFIER_FORMAT = '[\\w\\d_-]+';
const FQN_FORMAT = `(${JS_IDENTIFIER_FORMAT}\.)*${JS_IDENTIFIER_FORMAT}`;
const GLOBAL = 'GLOBAL';
const ANY_SYMBOL = 'ANY_SYMBOL';
const CLOSURE = 'CLOSURE';
/** A fqn made out of a dot-separated chain of JS identifiers. */
const ABSOLUTE_RE = new RegExp(`^${PATH_NAME_FORMAT}\\|${FQN_FORMAT}$`);
/**
 * Clutz glues js symbols to ts namespace by prepending "ಠ_ಠ.clutz.".
 * We need to include this prefix when the banned name is from Closure.
 */
const CLUTZ_SYM_PREFIX = 'ಠ_ಠ.clutz.';

/**
 * This class matches symbols given a "foo.bar.baz" name, where none of the
 * steps are instances of classes.
 *
 * Note that this isn't smart about subclasses and types: to write a check, we
 * strongly suggest finding the expected symbol in externs to find the object
 * name on which the symbol was initially defined.
 *
 * This matcher requires a scope for the symbol, which may be `GLOBAL`,
 * `ANY_SYMBOL`, `CLOSURE` or a file path filter. `CLOSURE` indicates that the
 * symbol is from the JS Closure library processed by clutz. The matcher begins
 * with this scope, then the separator "|", followed by the symbol name. For
 * example, "GLOBAL|eval".
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

    if (this.filePath === CLOSURE) {
      this.bannedName = CLUTZ_SYM_PREFIX + this.bannedName;
    }
  }

  matches(n: ts.Node, tc: ts.TypeChecker): boolean {
    debugLog(() => `start matching ${n.getText()} in ${n.parent.getText()}`);

    // Check if the node is being declared. Declaration may be imported without
    // programmer being aware of. We should not alert them about that.
    // Since import statments are also declarations, this have two notable
    // consequences.
    // - Match is negative for imports without renaming
    // - Match is positive for imports with renaming, when the imported name
    //   is the target. Since Tsetse is flow insensitive and we don't track
    //   symbol aliases, the import statement is the only place we can match
    //   bad symbols if they get renamed.
    if (isNameInDeclaration(n)) {
      debugLog(() => `We don't flag symbol declarations`);
      return false;
    }

    // Get the symbol (or the one at the other end of this alias) that we're
    // looking at.
    const s = dealias(tc.getSymbolAtLocation(n), tc);
    if (!s) {
      debugLog(() => `cannot get symbol`);
      return false;
    }

    // The TS-provided FQN tells us the full identifier, and the origin file
    // in some circumstances.
    const fqn = tc.getFullyQualifiedName(s);
    debugLog(() => `got FQN ${fqn}`);

    // Name-based check: `getFullyQualifiedName` returns `"filename".foo.bar` or
    // just `foo.bar` if the symbol is ambient. The check here should consider
    // both cases.
    if (!fqn.endsWith('".' + this.bannedName) && fqn !== this.bannedName) {
      debugLog(() => `FQN ${fqn} doesn't match name ${this.bannedName}`);
      return false;
    }

    // If `ANY_SYMBOL` or `CLOSURE` is specified, it's sufficient to conclude we
    // have a match.
    if (this.filePath === ANY_SYMBOL || this.filePath === CLOSURE) {
      return true;
    }

    // If there is no declaration, the symbol is a language built-in object.
    // This is a match only if `GLOBAL` is specified.
    const declarations = s.getDeclarations();
    if (declarations === undefined) {
      return this.filePath === GLOBAL;
    }

    // No file info in the FQN means it's imported from a .d.ts declaration
    // file. This can be from a core library, a JS library, or an exported local
    // symbol defined in another TS target. We need to extract the name of the
    // declaration file.
    if (!fqn.startsWith('"')) {
      if (this.filePath === GLOBAL) {
        return declarations.some(isInStockLibraries);
      } else {
        return declarations.some((d) => {
          const srcFilePath = d.getSourceFile()?.fileName;
          return srcFilePath && srcFilePath.match(this.filePath);
        })
      }
    } else {
      const last = fqn.indexOf('"', 1);
      if (last === -1) {
        throw new Error('Malformed fully-qualified name.');
      }
      const filePath = fqn.substring(1, last);
      return filePath.match(this.filePath) !== null;
    }
  }
}
