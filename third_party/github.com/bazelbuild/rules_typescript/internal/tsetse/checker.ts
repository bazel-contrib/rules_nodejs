/**
 * @fileoverview Checker contains all the information we need to perform source
 * file AST traversals and report errors.
 */

import * as ts from 'typescript';
import {Failure, Fix} from './failure';


/**
 * A Handler contains a handler function and its corresponding error code so
 * when the handler function is triggered we know which rule is violated.
 */
interface Handler<T extends ts.Node> {
  handlerFunction(checker: Checker, node: T): void;
  code: number;
}

/**
 * Tsetse rules use on() and addFailureAtNode() for rule implementations.
 * Rules can get a ts.TypeChecker from checker.typeChecker so typed rules are
 * possible. Compiler uses execute() to run the Tsetse check.
 */
export class Checker {
  /** Node to handlers mapping for all enabled rules. */
  private readonly nodeHandlersMap =
      new Map<ts.SyntaxKind, Handler<ts.Node>[]>();
  /**
   * Mapping from identifier name to handlers for all rules inspecting property
   * names.
   */
  private readonly namedIdentifierHandlersMap =
      new Map<string, Handler<ts.Identifier>[]>();
  /**
   * Mapping from property name to handlers for all rules inspecting property
   * accesses expressions.
   */
  private readonly namedPropertyAccessHandlersMap =
      new Map<string, Handler<ts.PropertyAccessExpression>[]>();

  private failures: Failure[] = [];
  private currentSourceFile: ts.SourceFile|undefined;
  // currentCode will be set before invoking any handler functions so the value
  // initialized here is never used.
  private currentCode = 0;
  /** Allow typed rules via typeChecker. */
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
  on<T extends ts.Node>(
      nodeKind: T['kind'], handlerFunction: (checker: Checker, node: T) => void,
      code: number) {
    const newHandler: Handler<T> = {handlerFunction, code};
    const registeredHandlers = this.nodeHandlersMap.get(nodeKind);
    if (registeredHandlers === undefined) {
      this.nodeHandlersMap.set(nodeKind, [newHandler]);
    } else {
      registeredHandlers.push(newHandler);
    }
  }

  /**
   * Similar to `on`, but registers handlers on more specific node type, i.e.,
   * identifiers.
   */
  onNamedIdentifier(
      identifierName: string,
      handlerFunction: (checker: Checker, node: ts.Identifier) => void,
      code: number) {
    const newHandler: Handler<ts.Identifier> = {handlerFunction, code};
    const registeredHandlers =
        this.namedIdentifierHandlersMap.get(identifierName);
    if (registeredHandlers === undefined) {
      this.namedIdentifierHandlersMap.set(identifierName, [newHandler]);
    } else {
      registeredHandlers.push(newHandler);
    }
  }

  /**
   * Similar to `on`, but registers handlers on more specific node type, i.e.,
   * property access expressions.
   */
  onNamedPropertyAccess(
      propertyName: string,
      handlerFunction:
          (checker: Checker, node: ts.PropertyAccessExpression) => void,
      code: number) {
    const newHandler:
        Handler<ts.PropertyAccessExpression> = {handlerFunction, code};
    const registeredHandlers =
        this.namedPropertyAccessHandlersMap.get(propertyName);
    if (registeredHandlers === undefined) {
      this.namedPropertyAccessHandlersMap.set(propertyName, [newHandler]);
    } else {
      registeredHandlers.push(newHandler);
    }
  }

  /**
   * Add a failure with a span.
   */
  addFailure(start: number, end: number, failureText: string, fix?: Fix) {
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
        this.currentSourceFile, start, end, failureText, this.currentCode, fix);
    this.failures.push(failure);
  }

  addFailureAtNode(node: ts.Node, failureText: string, fix?: Fix) {
    // node.getStart() takes a sourceFile as argument whereas node.getEnd()
    // doesn't need it.
    this.addFailure(
        node.getStart(this.currentSourceFile), node.getEnd(), failureText, fix);
  }

  /** Dispatch general handlers registered via `on` */
  dispatchNodeHandlers(node: ts.Node) {
    const handlers = this.nodeHandlersMap.get(node.kind);
    if (handlers === undefined) {
      return;
    }

    for (const handler of handlers) {
      this.currentCode = handler.code;
      handler.handlerFunction(this, node);
    }
  }

  /** Dispatch identifier handlers registered via `onNamedIdentifier` */
  dispatchNamedIdentifierHandlers(id: ts.Identifier) {
    const handlers = this.namedIdentifierHandlersMap.get(id.text);
    if (handlers === undefined) {
      return;
    }

    for (const handler of handlers) {
      this.currentCode = handler.code;
      handler.handlerFunction(this, id);
    }
  }

  /**
   * Dispatch property access handlers registered via `onNamedPropertyAccess`
   */
  dispatchNamedPropertyAccessHandlers(prop: ts.PropertyAccessExpression) {
    const handlers = this.namedPropertyAccessHandlersMap.get(prop.name.text);
    if (handlers === undefined) {
      return;
    }

    for (const handler of handlers) {
      this.currentCode = handler.code;
      handler.handlerFunction(this, prop);
    }
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
    run(sourceFile);
    return this.failures;

    function run(node: ts.Node) {
      // Dispatch handlers registered via `on`
      thisChecker.dispatchNodeHandlers(node);

      // Dispatch handlers for named identifiers and properties
      if (ts.isIdentifier(node)) {
        thisChecker.dispatchNamedIdentifierHandlers(node);
      } else if (ts.isPropertyAccessExpression(node)) {
        thisChecker.dispatchNamedPropertyAccessHandlers(node);
      }

      ts.forEachChild(node, run);
    }
  }
}
