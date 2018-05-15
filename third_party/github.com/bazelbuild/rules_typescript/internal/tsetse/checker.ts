/**
 * @fileoverview Checker contains all the information we need to perform source
 * file AST traversals and report errors.
 */


import * as ts from 'typescript';

import {Failure} from './failure';

/**
 * A Handler contains a handler function and its corresponding error code so
 * when the handler function is triggered we know which rule is violated.
 */
interface Handler {
  handlerFunction(checker: Checker, node: ts.Node): void;
  code: number;
}

/**
 * Tsetse rules use on() and addFailureAtNode() for rule implementations.
 * Rules can get a ts.TypeChecker from checker.typeChecker so typed rules are
 * possible. Compiler uses execute() to run the Tsetse check.
 */
export class Checker {
  /**
   * nodeHandlersMap contains node to handlers mapping for all enabled rules.
   */
  private nodeHandlersMap = new Map<ts.SyntaxKind, Handler[]>();
  private failures: Failure[] = [];
  private currentSourceFile: ts.SourceFile | undefined;
  // currentCode will be set before invoking any handler functions so the value
  // initialized here is never used.
  private currentCode = 0;
  /**
   * Allow typed rules via typeChecker.
   */
  typeChecker: ts.TypeChecker;

  constructor(program: ts.Program) {
    // Avoid the cost for each rule to create a new TypeChecker.
    this.typeChecker = program.getTypeChecker();
  }

  /**
   * This doesn't run any checks yet. Instead, it registers `handlerFunction` on
   * `nodeKind` node in `nodeHandlersMap` map. After all rules register their
   * handlers, the source file AST will be traversed.
   */
  on(nodeKind: ts.SyntaxKind.BinaryExpression,
     handlerFunction: (checker: Checker, node: ts.BinaryExpression) => void,
     code: number): void;
  on(nodeKind: ts.SyntaxKind.CallExpression,
     handlerFunction: (checker: Checker, node: ts.CallExpression) => void,
     code: number): void;
  on(nodeKind: ts.SyntaxKind.PropertyDeclaration,
     handlerFunction: (checker: Checker, node: ts.PropertyDeclaration) => void,
     code: number): void;
  on(nodeKind: ts.SyntaxKind.ElementAccessExpression,
     handlerFunction: (checker: Checker, node: ts.ElementAccessExpression) => void,
     code: number): void;
  on(nodeKind: ts.SyntaxKind,
     handlerFunction: (checker: Checker, node: ts.Node) => void,
     code: number): void;
  on<T extends ts.Node>(
      nodeKind: ts.SyntaxKind,
      handlerFunction: (checker: Checker, node: T) => void, code: number) {
    const newHandler: Handler = {handlerFunction, code};
    const registeredHandlers: Handler[]|undefined =
        this.nodeHandlersMap.get(nodeKind);
    if (registeredHandlers === undefined) {
      this.nodeHandlersMap.set(nodeKind, [newHandler]);
    } else {
      registeredHandlers.push(newHandler);
    }
  }

  /**
   * Add a failure with a span. addFailure() is currently private because
   * `addFailureAtNode` is preferred.
   */
  private addFailure(start: number, end: number, failureText: string) {
    if (!this.currentSourceFile) {
      throw new Error('Source file not defined');
    }
    if (start >= end || end > this.currentSourceFile.end || start < 0) {
      // Since only addFailureAtNode() is exposed for now this shouldn't happen.
      throw new Error(
          `Invalid start and end position: [${start}, ${end}]` +
          ` in file ${this.currentSourceFile.fileName}.`);
    }

    const failure = new Failure(
        this.currentSourceFile, start, end, failureText, this.currentCode);
    this.failures.push(failure);
  }

  addFailureAtNode(node: ts.Node, failureText: string) {
    // node.getStart() takes a sourceFile as argument whereas node.getEnd()
    // doesn't need it.
    this.addFailure(
        node.getStart(this.currentSourceFile), node.getEnd(), failureText);
  }

  /**
   * Walk `sourceFile`, invoking registered handlers with Checker as the first
   * argument and current node as the second argument. Return failures if there
   * are any.
   */
  execute(sourceFile: ts.SourceFile): Failure[] {
    const thisChecker = this;
    this.currentSourceFile = sourceFile;
    this.failures = [];
    ts.forEachChild(sourceFile, run);
    return this.failures;

    function run(node: ts.Node) {
      const handlers: Handler[]|undefined =
          thisChecker.nodeHandlersMap.get(node.kind);
      if (handlers !== undefined) {
        for (const handler of handlers) {
          thisChecker.currentCode = handler.code;
          handler.handlerFunction(thisChecker, node);
        }
      }
      ts.forEachChild(node, run);
    }
  }
}
