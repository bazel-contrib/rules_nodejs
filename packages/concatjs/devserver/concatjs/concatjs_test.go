package concatjs

import (
	"bytes"
	"fmt"
	"net/http"
	"net/http/httptest"
	"path/filepath"
	"reflect"
	"strings"
	"sync"
	"testing"
	"time"
)

// This test is mostly verifying that we drop javascript/closure/deps.js
// This is only important in google3.
func TestManifestFiles(t *testing.T) {
	files, err := manifestFilesFromReader(strings.NewReader(`foo.js

javascript/closure/deps.js
bar.js
`))
	if err != nil {
		t.Fatal(err)
	}
	want := []string{"foo.js", "bar.js"}
	if !reflect.DeepEqual(files, want) {
		t.Errorf("Parse incorrect, got %v, want %v", files, want)
	}
}

func TestWriteJSEscaped(t *testing.T) {
	var b bytes.Buffer
	if err := writeJSEscaped(&b, []byte("test \\ ' \n \r end")); err != nil {
		t.Error(err)
	}
	got := string(b.Bytes())
	want := `test \\ \' \n \r end`
	if got != want {
		t.Errorf("Incorrect escaping, want %s, got %s", want, got)
	}
}

type fakeFileSystem struct {
	mux             sync.Mutex
	fakeReadFile    func(filename string) ([]byte, error)
	fakeStatMtime   func(filename string) (time.Time, error)
	fakeResolvePath func(root string, filename string) (string, error)
}

func (fs *fakeFileSystem) ReadFile(filename string) ([]byte, error) {
	fs.mux.Lock()
	defer fs.mux.Unlock()
	return fs.fakeReadFile(filename)
}

func (fs *fakeFileSystem) StatMtime(filename string) (time.Time, error) {
	fs.mux.Lock()
	defer fs.mux.Unlock()
	return fs.fakeStatMtime(filename)
}

func (fs *fakeFileSystem) ResolvePath(root string, filename string) (string, error) {
	fs.mux.Lock()
	defer fs.mux.Unlock()
	return fs.fakeResolvePath(root, filename)
}

func TestWriteFiles(t *testing.T) {
	var inputFiles = []string{"a", "missing", "module"}

	fs := fakeFileSystem{
		fakeReadFile: func(filename string) ([]byte, error) {
			var normalizedFilename = pathReplacer.Replace(filename)
			switch normalizedFilename {
			case "root/a":
				return []byte("a content"), nil
			case "root/module":
				return []byte("// A module\ngoog.module('hello');"), nil
			default:
				return []byte{}, fmt.Errorf("unexpected file read: %s", normalizedFilename)
			}
		},
		fakeStatMtime: func(filename string) (time.Time, error) {
			var normalizedFilename = pathReplacer.Replace(filename)
			switch normalizedFilename {
			case "root/a", "root/module":
				return time.Now(), nil
			default:
				return time.Time{}, fmt.Errorf("unexpected file stat: %s", normalizedFilename)
			}
		},
		fakeResolvePath: func(root string, filename string) (string, error) {
			return filepath.Join(root, filename), nil
		},
	}

	cache := NewFileCache("root", &fs)

	var b bytes.Buffer
	cache.WriteFiles(&b, inputFiles)

	got := string(b.Bytes())
	want := `// a
eval('a content\n\n//# sourceURL=http://concatjs/root/a\n');
// missing
throw new Error('loading missing failed: unexpected file stat: root/missing');
// module
goog.loadModule('// A module\ngoog.module(\'hello\');\n\n//# sourceURL=http://concatjs/root/module\n');
`

	if got != want {
		t.Errorf("Response differs, want %s, got %s", want, got)
	}
}

func TestFileCaching(t *testing.T) {
	var reads int

	fs := fakeFileSystem{
		fakeReadFile: func(string) ([]byte, error) {
			reads++
			return nil, nil
		},
		fakeStatMtime: func(string) (time.Time, error) {
			return time.Time{}, nil
		},
		fakeResolvePath: func(root string, filename string) (string, error) {
			return filepath.Join(root, filename), nil
		},
	}

	var b bytes.Buffer
	cache := NewFileCache("", &fs)
	cache.WriteFiles(&b, []string{"a", "b"})
	if reads != 2 {
		t.Errorf("got %d file reads, want 2", reads)
	}
	reads = 0
	cache.WriteFiles(&b, []string{"a", "b"})
	if reads != 0 {
		t.Errorf("got %d reads, expected no further", reads)
	}
}

func TestAcceptHeader(t *testing.T) {
	tests := []struct {
		header   map[string][]string
		expected bool
	}{
		{header: map[string][]string{"Other": []string{"gzip"}}, expected: false},
		{header: map[string][]string{"Accept-Encoding": []string{"rot13"}}, expected: false},
		{header: map[string][]string{"Accept-Encoding": []string{"rot13, gzip, deflate"}}, expected: true},
	}
	for _, test := range tests {
		res := acceptGzip(test.header)
		if res != test.expected {
			t.Errorf("Expect %t, got %t for %s", test.expected, res, test.header)
		}
	}
}

func TestCustomFileResolving(t *testing.T) {
	fs := fakeFileSystem{
		fakeReadFile: func(filename string) ([]byte, error) {
			var normalizedFilename = pathReplacer.Replace(filename)
			switch normalizedFilename {
			case "/system_root/bazel-bin/a.txt":
				return []byte("a content"), nil
			case "/system_root/bazel-bin/nested/b.js":
				return []byte("b content"), nil
			default:
				return []byte{}, fmt.Errorf("unexpected file read: %s", normalizedFilename)
			}
		},
		fakeStatMtime: func(filename string) (time.Time, error) {
			return time.Now(), nil
		},
		fakeResolvePath: func(root string, filename string) (string, error) {
			// For this test, we use an absolute root. This is similar to how
			// Bazel resolves runfiles through the manifest.
			return filepath.Join("/system_root/bazel-bin/", filename), nil
		},
	}

	cache := NewFileCache("", &fs)

	var b bytes.Buffer
	cache.WriteFiles(&b, []string{"a.txt", "nested/b.js"})

	actual := string(b.Bytes())
	expected := `// a.txt
eval('a content\n\n//# sourceURL=http://concatjs//system_root/bazel-bin/a.txt\n');
// nested/b.js
eval('b content\n\n//# sourceURL=http://concatjs//system_root/bazel-bin/nested/b.js\n');
`

	if actual != expected {
		t.Errorf("Response differs, actual: %s, expected: %s", actual, expected)
	}
}

func runOneRequest(b *testing.B, handler http.Handler, gzip bool) {
	req, err := http.NewRequest("GET", "", nil)
	if err != nil {
		b.Fatal(err)
	}
	if gzip {
		req.Header["Accept-Encoding"] = []string{"gzip"}
	}
	w := httptest.NewRecorder()
	handler.ServeHTTP(w, req)
	if w.Code != http.StatusOK {
		b.Errorf("HTTP request failed: %d", w.Code)
	}
}
