// Package runfiles that provides utility helpers for resolving Bazel runfiles within Go.
package runfiles

import (
	"os"
	"path/filepath"
	"strings"

	"github.com/bazelbuild/rules_go/go/tools/bazel"
)

// Runfile returns the base directory to the bazel runfiles
func Runfile(_base string, manifestPath string) (string, error) {
	// If the path is a absolute path then resolve it directly before adapting lookup path
	// The below resolution logic is copied from the bazel.Runfile function
	if _, err := os.Stat(manifestPath); err == nil {
		return filepath.Abs(manifestPath)
	}

	// It seems like any npm dependency is referenced like 'cloud/../npm/node_modules/@angular/core/bundles/core.umd.js' and 'cloud/../npm/@bazel/typescript/third_party/npm/requirejs/require.js'
	// This is true for both script dependencies and scriptsManifest
	// If they are corrected to 'node_modules/@angular/core/bundles/core.umd.js' and '@bazel/typescript/third_party/npm/requirejs/require.js' the following if condition can be removed
	if i := strings.Index(manifestPath, "/../npm"); i > 0 {
		manifestPath = manifestPath[:i] + manifestPath[i+len("/../npm"):]
	}

	// github.com/bazelbuild/rules_go/go/tools/bazel package expects label used with bazel.Runfile not to contain the repository name
	// When passing the MANIFEST file it always split on the first / e.g. <workspace>/<label> here we must do the same
	i := strings.IndexByte(manifestPath, '/')
	manifestPath = manifestPath[i+1:]
	result, err := bazel.Runfile(manifestPath)

	return result, err
}
