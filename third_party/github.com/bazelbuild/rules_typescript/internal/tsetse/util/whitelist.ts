/**
 * A whitelist entry, corresponding to a logical whitelisting rule. Use these
 * to distinguish between various logical reasons for whitelisting something:
 * for instance, tie these to particular bugs that needed whitelisting, per
 * legacy project, manually reviewed entries, and so on.
 *
 * Whitelists are based on the file paths provided by the TS compiler, with
 * both regexp-based checks and prefix-based checks.
 *
 *
 * Follows the logic in
 * https://github.com/google/closure-compiler/blob/master/src/com/google/javascript/jscomp/conformance.proto.
 */
export interface WhitelistEntry {
  /** The category corresponding to this entry. */
  readonly reason: WhitelistReason;
  /** Why is this okay to whitelist. */
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
 * The categories of whitelist entries.
 */
export enum WhitelistReason {
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
 * A complete whitelist with all related WhitelistEntry grouped together, with
 * WhitelistReason ignored since it is purely for documentary purposes.
 */
export class Whitelist {
  private readonly whitelistedPrefixes: readonly string[] = [];
  private readonly whitelistedRegExps: readonly RegExp[] = [];
  // To avoid repeated computation for whitelisting queries with the same file
  // path, create a memoizer to cache known results. This is useful in watch
  // mode (and possible in language service) when the same files can be compiled
  // repeatedly.
  private readonly whitelistMemoizer: Map<string, boolean> = new Map();

  constructor(whitelistEntries?: WhitelistEntry[]) {
    if (whitelistEntries) {
      for (const e of whitelistEntries) {
        if (e.prefix) {
          this.whitelistedPrefixes =
              this.whitelistedPrefixes.concat(...e.prefix);
        }
        if (e.regexp) {
          this.whitelistedRegExps = this.whitelistedRegExps.concat(
              ...e.regexp.map(r => new RegExp(r)));
        }
      }
    }
  }

  isWhitelisted(filePath: string): boolean {
    if (this.whitelistMemoizer.has(filePath)) {
      return this.whitelistMemoizer.get(filePath)!;
    }
    for (const p of this.whitelistedPrefixes) {
      if (filePath.startsWith(p)) {
        this.whitelistMemoizer.set(filePath, true);
        return true;
      }
    }
    for (const re of this.whitelistedRegExps) {
      if (re.test(filePath)) {
        this.whitelistMemoizer.set(filePath, true);
        return true;
      }
    }
    this.whitelistMemoizer.set(filePath, false);
    return false;
  }
}
