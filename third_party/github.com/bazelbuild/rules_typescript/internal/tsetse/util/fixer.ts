import * as ts from "typescript";
import { Fix, IndividualChange } from "../failure";
import { debugLog } from "./ast_tools";

/**
 * A Fixer turns Nodes (that are supposed to have been matched before) into a
 * Fix. This is meant to be implemented by Rule implementers (or
 * ban-preset-pattern users). See also `buildReplacementFixer` for a simpler way
 * of implementing a Fixer.
 */
export interface Fixer {
  getFixForFlaggedNode(node: ts.Node): Fix | undefined;
}

/**
 * A simple Fixer builder based on a function that looks at a node, and
 * output either nothing, or a replacement. If this is too limiting, implement
 * Fixer instead.
 */
export function buildReplacementFixer(
  potentialReplacementGenerator: (
    node: ts.Node
  ) => { replaceWith: string } | undefined
): Fixer {
  return {
    getFixForFlaggedNode: (n: ts.Node): Fix | undefined => {
      const partialFix = potentialReplacementGenerator(n);
      if (!partialFix) {
        return;
      }
      return {
        changes: [
          {
            sourceFile: n.getSourceFile(),
            start: n.getStart(),
            end: n.getEnd(),
            replacement: partialFix.replaceWith,
          },
        ],
      };
    },
  };
}

// TODO(rjamet): Both maybeAddNamedImport and maybeAddNamespacedImport are too
// hard to read to my taste. This could probably be improved upon by being more
// functionnal, to show the filter passes and get rid of the continues and
// returns (which are confusing).

/**
 * Builds an IndividualChange that imports the required symbol from the given
 * file under the given name. This might reimport the same thing twice in some
 * cases, but it will always make it available under the right name (though
 * its name might collide with other imports, as we don't currently check for
 * that).
 */
export function maybeAddNamedImport(
  source: ts.SourceFile,
  importWhat: string,
  fromFile: string,
  importAs?: string,
  tazeComment?: string
): IndividualChange | undefined {
  const importStatements = source.statements.filter(ts.isImportDeclaration);
  const importSpecifier = importAs
    ? `${importWhat} as ${importAs}`
    : importWhat;

  for (const iDecl of importStatements) {
    const parsedDecl = maybeParseImportNode(iDecl);
    if (!parsedDecl || parsedDecl.fromFile !== fromFile) {
      // Not an import from the right file, or couldn't understand the import.
      continue; // Jump to the next import.
    }
    if (ts.isNamespaceImport(parsedDecl.namedBindings)) {
      debugLog(() => `... but it's a wildcard import`);
      continue; // Jump to the next import.
    }

    // Else, bindings is a NamedImports. We can now search whether the right
    // symbol is there under the right name.
    const foundRightImport = parsedDecl.namedBindings.elements.some((iSpec) =>
      iSpec.propertyName
        ? iSpec.name.getText() === importAs && // import {foo as bar}
          iSpec.propertyName.getText() === importWhat
        : iSpec.name.getText() === importWhat
    ); // import {foo}

    if (foundRightImport) {
      debugLog(
        () => `"${iDecl.getFullText()}" imports ${importWhat} as we want.`
      );
      return; // Our request is already imported under the right name.
    }

    // Else, insert our symbol in the list of imports from that file.
    debugLog(() => `No named imports from that file, generating new fix`);
    return {
      start: parsedDecl.namedBindings.elements[0].getStart(),
      end: parsedDecl.namedBindings.elements[0].getStart(),
      sourceFile: source,
      replacement: `${importSpecifier}, `,
    };
  }

  // If we get here, we didn't find anything imported from the wanted file, so
  // we'll need the full import string. Add it after the last import,
  // and let the formatter handle the rest.
  const newImportStatement =
    `import {${importSpecifier}} from '${fromFile}';` +
    (tazeComment ? `  ${tazeComment}\n` : `\n`);
  const insertionPosition = importStatements.length
    ? importStatements[importStatements.length - 1].getEnd() + 1
    : 0;
  return {
    start: insertionPosition,
    end: insertionPosition,
    sourceFile: source,
    replacement: newImportStatement,
  };
}

/**
 * Builds an IndividualChange that imports the required namespace from the given
 * file under the given name. This might reimport the same thing twice in some
 * cases, but it will always make it available under the right name (though
 * its name might collide with other imports, as we don't currently check for
 * that).
 */
export function maybeAddNamespaceImport(
  source: ts.SourceFile,
  fromFile: string,
  importAs: string,
  tazeComment?: string
): IndividualChange | undefined {
  const importStatements = source.statements.filter(ts.isImportDeclaration);

  const hasTheRightImport = importStatements.some((iDecl) => {
    const parsedDecl = maybeParseImportNode(iDecl);
    if (!parsedDecl || parsedDecl.fromFile !== fromFile) {
      // Not an import from the right file, or couldn't understand the import.
      return false;
    }
    debugLog(() => `"${iDecl.getFullText()}" is an import from the right file`);

    if (ts.isNamedImports(parsedDecl.namedBindings)) {
      debugLog(() => `... but it's a named import`);
      return false; // irrelevant to our namespace imports
    }
    // Else, bindings is a NamespaceImport.
    if (parsedDecl.namedBindings.name.getText() !== importAs) {
      debugLog(() => `... but not the right name, we need to reimport`);
      return false;
    }
    debugLog(() => `... and the right name, no need to reimport`);
    return true;
  });

  if (!hasTheRightImport) {
    const insertionPosition = importStatements.length
      ? importStatements[importStatements.length - 1].getEnd() + 1
      : 0;
    return {
      start: insertionPosition,
      end: insertionPosition,
      sourceFile: source,
      replacement: tazeComment
        ? `import * as ${importAs} from '${fromFile}';  ${tazeComment}\n`
        : `import * as ${importAs} from '${fromFile}';\n`,
    };
  }
  return;
}

/**
 * This tries to make sense of an ImportDeclaration, and returns the interesting
 * parts, undefined if the import declaration is valid but not understandable by
 * the checker.
 */
function maybeParseImportNode(iDecl: ts.ImportDeclaration):
  | {
      namedBindings: ts.NamedImportBindings | ts.NamespaceImport;
      fromFile: string;
    }
  | undefined {
  if (!iDecl.importClause) {
    // something like import "./file";
    debugLog(
      () => `Ignoring import without imported symbol: ${iDecl.getFullText()}`
    );
    return;
  }
  if (iDecl.importClause.name || !iDecl.importClause.namedBindings) {
    // Seems to happen in defaults imports like import Foo from 'Bar'.
    // Not much we can do with that when trying to get a hold of some symbols,
    // so just ignore that line (worst case, we'll suggest another import
    // style).
    debugLog(() => `Ignoring import: ${iDecl.getFullText()}`);
    return;
  }
  if (!ts.isStringLiteral(iDecl.moduleSpecifier)) {
    debugLog(() => `Ignoring import whose module specifier is not literal`);
    return;
  }
  return {
    namedBindings: iDecl.importClause.namedBindings,
    fromFile: iDecl.moduleSpecifier.text,
  };
}
