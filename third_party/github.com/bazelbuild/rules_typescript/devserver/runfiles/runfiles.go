// Package runfiles that provides utility helpers for resolving Bazel runfiles within Go.
package runfiles

import (
	"path/filepath"
	"strings"

	"github.com/bazelbuild/rules_go/go/tools/bazel"
)

// Runfile returns the base directory to the bazel runfiles
func Runfile(_base string, manifestPath string) (string, error) {
	// Absolute paths don't require a lookup in the runfiles manifest
	if filepath.IsAbs(manifestPath) {
		return manifestPath, nil
	}
	// Very hacky workaround for breaking change in rules_go
	// https://github.com/bazelbuild/rules_go/pull/2076#issuecomment-520628083
	// devserver was originally written to resolve full paths from the runfiles manifest
	// including the workspace segment, but rules_go no longer includes the workspace
	// segment in the lookup. We simply remove the first path segment before calling
	// through to the rules_go runfiles helper library.
	parts := strings.SplitN(manifestPath, "/", 2)
	if len(parts) < 2 {
		return bazel.Runfile(manifestPath)
	}
	// throw away parts[0] which is the name of the repository
	return bazel.Runfile(parts[1])
}
