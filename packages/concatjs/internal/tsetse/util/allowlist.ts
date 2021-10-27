/**
 * An exemption list entry, corresponding to a logical exemption rule. Use these
 * to distinguish between various logical reasons for exempting something:
 * for instance, tie these to particular bugs that needed to be exempted, per
 * legacy project, manually reviewed entries, and so on.
 *
 * Exemption lists are based on the file paths provided by the TS compiler, with
 * both regexp-based checks and prefix-based checks.
 *
 *
 * Follows the logic in
 * https://github.com/google/closure-compiler/blob/master/src/com/google/javascript/jscomp/conformance.proto.
 */
export interface AllowlistEntry {
  /** The category corresponding to this entry. */
  readonly reason: ExemptionReason;
  /** Why is this okay to be exempted?. */
  readonly explanation?: string;

  /**
   * Regexps for the paths of files that will be ignored by the
   * ConformancePattern. Beware, escaping can be tricky.
   */
  readonly regexp?: readonly string[];
  /**
   * Prefixes for the paths of files that will be ignored by the
   * ConformancePattern.
   */
  readonly prefix?: readonly string[];
}

/**
 * The categories of exemption entries.
 */
export enum ExemptionReason {
  /** No reason. */
  UNSPECIFIED,
  /** Code that has to be grandfathered in (no guarantees). */
  LEGACY,
  /**
   * Code that does not enter the scope of this particular check  (no
   * guarantees).
   */
  OUT_OF_SCOPE,
  /** Manually reviewed exceptions (supposedly okay). */
  MANUALLY_REVIEWED
}

/**
 * A complete allowlist with all related AllowlistEntry grouped together, with
 * ExemptionReason ignored since it is purely for documentary purposes.
 */
export class Allowlist {
  private readonly allowlistedPrefixes: readonly string[] = [];
  private readonly allowlistedRegExps: readonly RegExp[] = [];
  // To avoid repeated computation for allowlisting queries with the same file
  // path, create a memoizer to cache known results. This is useful in watch
  // mode (and possible in language service) when the same files can be compiled
  // repeatedly.
  private readonly allowlistMemoizer = new Map<string, boolean>();

  constructor(allowlistEntries?: AllowlistEntry[]) {
    if (allowlistEntries) {
      for (const e of allowlistEntries) {
        if (e.prefix) {
          this.allowlistedPrefixes =
              this.allowlistedPrefixes.concat(...e.prefix);
        }
        if (e.regexp) {
          this.allowlistedRegExps = this.allowlistedRegExps.concat(
              ...e.regexp.map(r => new RegExp(r)));
        }
      }
    }
  }

  isAllowlisted(filePath: string): boolean {
    if (this.allowlistMemoizer.has(filePath)) {
      return this.allowlistMemoizer.get(filePath)!;
    }
    for (const p of this.allowlistedPrefixes) {
      if (filePath.startsWith(p)) {
        this.allowlistMemoizer.set(filePath, true);
        return true;
      }
    }
    for (const re of this.allowlistedRegExps) {
      if (re.test(filePath)) {
        this.allowlistMemoizer.set(filePath, true);
        return true;
      }
    }
    this.allowlistMemoizer.set(filePath, false);
    return false;
  }
}
