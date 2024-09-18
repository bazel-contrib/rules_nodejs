/**
 * Utils for managing repository mappings.
 *
 * The majority of this code is ported from [rules_go](https://github.com/bazelbuild/rules_go/pull/3347).
 */

export interface RepoMappings {
  [sourceRepo: string]: {
    [targetRepoApparentName: string]: string;
  };
}

const legacyExternalGeneratedFile =
  /\/_main\/bazel-out\/[^/]+\/bin\/external\/([^/]+)\//;
const legacyExternalFile = /\/_main\/external\/([^/]+)\//;

// CurrentRepository returns the canonical name of the Bazel repository that
// contains the source file of the caller of CurrentRepository.
export function currentRepository(): string {
  return callerRepositoryFromStack(1);
}

// CallerRepository returns the canonical name of the Bazel repository that
// contains the source file of the caller of the function that itself calls
// CallerRepository.
export function callerRepository(): string {
  return callerRepositoryFromStack(2);
}

export function callerRepositoryFromStack(skip: number): string {
  const stack = new Error().stack.split("\n");
  const file = stack[skip + 2]; // 0 is the Error(msg), 1 is this method, 2 is the caller
  const match =
    file.match(legacyExternalGeneratedFile) || file.match(legacyExternalFile);

  // If a file is not in an external repository, it is in the main repository,
  // which has the empty string as its canonical name.
  if (!match || match[0] == "_main") {
    return "";
  }

  return match[0];
}
