package platform

import (
	"os"
	"path/filepath"
)

func Walk(root string, walkFn func(path string, typ os.FileMode) error) error {
	return filepath.Walk(root, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}
		return walkFn(path, info.Mode())
	})
}
