package platform

import (
	"os"

	"google3/third_party/golang/go_tools/internal/fastwalk/fastwalk"
)

// Walk does a faster filesystem walk than filepath.Walk by wrapping
// fastwalk.Walk.
// Performance was measured by timing updater.Paths when running taze
//--recursive on the cloud directory, both after a clearing the srcfs cache, and
// on subsequent runs.
// fastwalk, without cache: 2m35.950528503s
// fastwalk, with cache: 940.908936ms
// filepath.Walk without cache: 34m55.55114913s
// filepath.Walk with cache: 26.917530244s
func Walk(root string, walkFn func(path string, typ os.FileMode) error) error {
	return fastwalk.Walk(root, walkFn)
}
