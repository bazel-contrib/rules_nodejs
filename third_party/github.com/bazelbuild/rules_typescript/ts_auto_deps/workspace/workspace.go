package workspace

import "github.com/bazelbuild/buildtools/wspace"

// Root finds the closest directory containing a WORKSPACE file from p.
func Root(p string) (string, error) {
	return wspace.Find(p)
}

// Name returns the name of the workspace.
func Name() string {
	return "TODO"
}
