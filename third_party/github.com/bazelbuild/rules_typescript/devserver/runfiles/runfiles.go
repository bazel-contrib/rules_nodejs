// Package runfiles that provides utility helpers for resolving Bazel runfiles within Go.
package runfiles

import "github.com/bazelbuild/rules_go/go/tools/bazel"

// Runfile returns the base directory to the bazel runfiles
func Runfile(_base string, manifestPath string) (string, error) {
	return bazel.Runfile(manifestPath)
}

