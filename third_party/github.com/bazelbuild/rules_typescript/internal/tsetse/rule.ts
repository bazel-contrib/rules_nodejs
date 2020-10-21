import {Checker} from './checker';

/**
 * Tsetse rules should extend AbstractRule and provide a `register` function.
 * Rules are instantiated once per compilation operation and used across many
 * files.
 */
export abstract class AbstractRule {
  /**
   * A lower-dashed-case name for that rule. This is not used by Tsetse itself,
   * but the integrators might (such as the TypeScript Bazel rules, for
   * instance).
   */
  abstract readonly ruleName: string;
  abstract readonly code: number;

  /**
   * Registers handler functions on nodes in Checker.
   */
  abstract register(checker: Checker): void;
}
