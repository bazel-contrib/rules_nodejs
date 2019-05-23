import * as ts from 'typescript';
import {Checker} from '../../checker';
import {ErrorCode} from '../../error_code';
import {Fix} from '../../failure';
import {debugLog, isPropertyWriteExpression, shouldExamineNode} from '../ast_tools';
import {Fixer} from '../fixer';
import {isLiteral} from '../is_literal';
import {PropertyMatcher} from '../match_symbol';
import {Config, MatchedNodeTypes, PatternKind} from '../pattern_config';
import {PatternEngine} from './pattern_engine';

// Just for conciseness.
type BanKind = PatternKind.BANNED_PROPERTY_NON_CONSTANT_WRITE;

/**
 * The engine for BANNED_PROPERTY_NON_CONSTANT_WRITE.
 */
export class PropertyNonConstantWriteEngine extends PatternEngine<BanKind> {
  private readonly matcher: PropertyMatcher;
  constructor(
      config: Config<BanKind>, fixer?: Fixer<MatchedNodeTypes[BanKind]>) {
    super(config, fixer);
    // TODO: Support more than one single value here, or even build a
    // multi-pattern engine. This would help for performance.
    if (this.config.values.length !== 1) {
      throw new Error(
          `BANNED_PROPERTY_NON_CONSTANT_WRITE expects one value, got(${
              this.config.values.join(',')})`);
    }
    this.matcher = PropertyMatcher.fromSpec(this.config.values[0]);
  }

  register(checker: Checker) {
    checker.on(
        ts.SyntaxKind.BinaryExpression, this.check.bind(this),
        ErrorCode.CONFORMANCE_PATTERN);
  }

  check(c: Checker, n: ts.BinaryExpression) {
    if (!shouldExamineNode(n) || n.getSourceFile().isDeclarationFile ||
        !isPropertyWriteExpression(n)) {
      return;
    }
    debugLog(`inspecting ${n.getFullText().trim()}`);
    if (!this.matcher.matches(n.left, c.typeChecker)) {
      debugLog('Not an assignment to the right property');
      return;
    }
    if (isLiteral(c.typeChecker, n.right)) {
      debugLog(`Assigned value (${
          n.right.getFullText()}) is a compile-time constant.`);
      return;
    }
    const fix: Fix|undefined =
        this.fixer ? this.fixer.getFixForFlaggedNode(n) : undefined;
    c.addFailureAtNode(n, this.config.errorMessage, fix);
  }
}
