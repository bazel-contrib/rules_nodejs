// Package platform handles differences between google3 and open source for taze.
package platform

import (
	"context"

	"google3/file/base/go/file"
)

// ReadFile reads the contents of name.
func ReadFile(ctx context.Context, name string) ([]byte, error) {
	return file.ReadFile(ctx, name)
}

// ReadBytesFromFile reads bytes into the buffer provided, stopping when the
// buffer is full.
func ReadBytesFromFile(ctx context.Context, name string, buffer []byte) (int, error) {
	f, err := file.OpenRead(ctx, name)
	if err != nil {
		return 0, err
	}
	defer f.IO(ctx).Close()

	n, err := f.IO(ctx).Read(buffer)
	return n, err
}

// WriteFile writes data to filename.
func WriteFile(ctx context.Context, filename string, data []byte) error {
	return file.WriteFile(ctx, filename, data)
}

// Stat reads the file system information of name.
// NOTE: The result of Stat, FileStat or FileInfo for internal and external
// respectively, is never used. Since the two results are mostly incompatible
// structures, return an interface in both the open-source and internal version.
func Stat(ctx context.Context, name string) (interface{}, error) {
	return file.Stat(ctx, name)
}

// Glob returns all paths matching pattern.
func Glob(ctx context.Context, pattern string) ([]string, error) {
	stats, err := file.Match(ctx, pattern, file.StatNone)
	if err != nil {
		return nil, err
	}
	paths := make([]string, 0, len(stats))
	for _, stat := range stats {
		paths = append(paths, stat.Path)
	}
	return paths, nil
}

// Normalize is a no-op in google3. Note that file.go.oss has an implementation
// which fixes Windows paths.
func Normalize(path string) string {
	return path
}
