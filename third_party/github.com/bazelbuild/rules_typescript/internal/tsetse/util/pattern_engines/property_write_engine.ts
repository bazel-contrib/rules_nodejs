import * as ts from 'typescript';
import {Checker} from '../../checker';
import {ErrorCode} from '../../error_code';
import {Fix} from '../../failure';
import {debugLog, isPropertyWriteExpression, shouldExamineNode} from '../ast_tools';
import {Fixer} from '../fixer';
import {PropertyMatcher} from '../match_symbol';
import {Config, MatchedNodeTypes, PatternKind} from '../pattern_config';
import {PatternEngine} from '../pattern_engines/pattern_engine';

/**
 * The engine for BANNED_PROPERTY_WRITE.
 */
export class PropertyWriteEngine extends
    PatternEngine<PatternKind.BANNED_PROPERTY_WRITE> {
  private readonly matcher: PropertyMatcher;
  constructor(
      config: Config<PatternKind.BANNED_PROPERTY_WRITE>,
      fixer?: Fixer<MatchedNodeTypes[PatternKind.BANNED_PROPERTY_WRITE]>) {
    super(config, fixer);
    // TODO: Support more than one single value here, or even build a
    // multi-pattern engine. This would help for performance.
    if (this.config.values.length !== 1) {
      throw new Error(`BANNED_PROPERTY_WRITE expects one value, got(${
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
    if (this.matcher.matches(n.left, c.typeChecker)) {
      const fix: Fix|undefined =
          this.fixer ? this.fixer.getFixForFlaggedNode(n) : undefined;
      c.addFailureAtNode(n, this.config.errorMessage, fix);
    }
  }
}
