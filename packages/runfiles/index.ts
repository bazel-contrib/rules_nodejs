import {BAZEL_OUT_REGEX} from './paths';
import {Runfiles} from './runfiles';

// Re-export the `Runfiles` class. This class if the runfile helpers need to be
// mocked for testing purposes. This is used by the linker but also publicly exposed.
export {Runfiles};
// Re-export a RegExp for matching `bazel-out` paths. This is used by the linker
// but not intended for public use.
export {BAZEL_OUT_REGEX as _BAZEL_OUT_REGEX};

/** Instance of the runfile helpers. */
export const runfiles = new Runfiles(process.env);
