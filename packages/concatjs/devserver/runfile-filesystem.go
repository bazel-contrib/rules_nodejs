// Main package that provides a command line interface for starting a Bazel devserver
// using Bazel runfile resolution and ConcatJS for in-memory bundling of specified AMD files.
package main

import (
	"io/ioutil"
	"os"
	"time"

	"github.com/bazelbuild/rules_typescript/devserver/runfiles"
)

// RunfileFileSystem implements FileSystem type from concatjs.
type RunfileFileSystem struct{}

// StatMtime gets the filestamp for the last file modification.
func (fs *RunfileFileSystem) StatMtime(filename string) (time.Time, error) {
	s, err := os.Stat(filename)
	if err != nil {
		return time.Time{}, err
	}
	return s.ModTime(), nil
}

// ReadFile reads a file given its file name
func (fs *RunfileFileSystem) ReadFile(filename string) ([]byte, error) {
	return ioutil.ReadFile(filename)
}

// ResolvePath resolves the specified path within a given root using Bazel's runfile resolution.
// This is necessary because on Windows, runfiles are not symlinked and need to be
// resolved using the runfile manifest file.
func (fs *RunfileFileSystem) ResolvePath(root string, manifestFilePath string) (string, error) {
	return runfiles.Runfile(root, manifestFilePath)
}
