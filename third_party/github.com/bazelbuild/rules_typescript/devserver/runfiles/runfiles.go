// Package runfiles that provides utility helpers for resolving Bazel runfiles within Go.
package runfiles

import "github.com/bazelbuild/rules_go/go/tools/bazel"

// Runfile returns the base directory to the bazel runfiles
func Runfile(_ string, path string) (string, error) {
	return bazel.Runfile(path)
}

