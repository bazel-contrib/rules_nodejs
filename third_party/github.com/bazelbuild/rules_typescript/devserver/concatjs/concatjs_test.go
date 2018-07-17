package concatjs

import (
	"bytes"
	"fmt"
	"net/http"
	"net/http/httptest"
	"reflect"
	"strings"
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
	fakeReadFile  func(filename string) ([]byte, error)
	fakeStatMtime func(filename string) (time.Time, error)
}

func (fs *fakeFileSystem) readFile(filename string) ([]byte, error) {
	return fs.fakeReadFile(filename)
}

func (fs *fakeFileSystem) statMtime(filename string) (time.Time, error) {
	return fs.fakeStatMtime(filename)
}

func TestWriteFiles(t *testing.T) {
	fs := fakeFileSystem{
		fakeReadFile: func(filename string) ([]byte, error) {
			switch filename {
			case "root/a":
				return []byte("a content"), nil
			case "root/module":
				return []byte("// A module\ngoog.module('hello');"), nil
			default:
				return []byte{}, fmt.Errorf("unexpected file read: %s", filename)
			}
		},
		fakeStatMtime: func(filename string) (time.Time, error) {
			switch filename {
			case "root/a", "root/module":
				return time.Now(), nil
			default:
				return time.Time{}, fmt.Errorf("unexpected file stat: %s", filename)
			}
		},
	}

	cache := NewFileCache("root", &fs)

	var b bytes.Buffer
	cache.WriteFiles(&b, []string{"a", "missing", "module"})

	got := string(b.Bytes())
	want := `// a
eval('a content\n\n//# sourceURL=http://concatjs/a\n');
// missing
throw new Error('loading missing failed: unexpected file stat: root/missing');
// module
goog.loadModule('// A module\ngoog.module(\'hello\');\n\n//# sourceURL=http://concatjs/module\n');
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
