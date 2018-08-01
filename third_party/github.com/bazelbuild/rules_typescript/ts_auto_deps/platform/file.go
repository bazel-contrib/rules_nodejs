package platform

import (
	"context"
	"io/ioutil"
	"os"
	"path/filepath"
)

const (
	filePerms = 0666
)

// ReadFile reads the contents of name.
func ReadFile(ctx context.Context, name string) ([]byte, error) {
	return ioutil.ReadFile(name)
}

// WriteFile writes data to filename.
func WriteFile(ctx context.Context, filename string, data []byte) error {
	return ioutil.WriteFile(filename, data, filePerms)
}

// Stat reads the file system information of name.
func Stat(ctx context.Context, name string) (interface{}, error) {
	return os.Stat(name)
}

// Glob returns all paths matching pattern.
func Glob(ctx context.Context, pattern string) ([]string, error) {
	return filepath.Glob(pattern)
}
