package platform

import (
	"context"
	"io/ioutil"
	"os"
	"path/filepath"
	"strings"
)

const (
	filePerms = 0666
)

var pathReplacer = strings.NewReplacer("\\", "/")

// ReadFile reads the contents of name.
func ReadFile(ctx context.Context, name string) ([]byte, error) {
	return ioutil.ReadFile(name)
}

// ReadBytesFromFile reads bytes into the buffer provided, stopping when the
// buffer is full.
func ReadBytesFromFile(ctx context.Context, name string, buffer []byte) (int, error) {
	f, err := os.Open(name)
	if err != nil {
		return 0, err
	}
	defer f.Close()

	n, err := f.Read(buffer)
	return n, err
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

// Normalize converts Windows path separators into POSIX
func Normalize(path string) string {
	return pathReplacer.Replace(path)
}
