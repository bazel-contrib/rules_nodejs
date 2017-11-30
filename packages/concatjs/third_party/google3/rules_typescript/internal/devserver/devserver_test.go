package devserver

import (
	"fmt"
	"io/ioutil"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func tmpfile(t *testing.T, name, contents string) (string, func()) {
	fullPath := filepath.Join(os.Getenv("TEST_TMPDIR"), name)
	dir := filepath.Dir(fullPath)
	if _, err := os.Stat(dir); err != nil {
		if os.IsNotExist(err) {
			if err := os.MkdirAll(dir, 0777); err != nil {
				t.Fatalf("failed to create dir: %v", err)
			}
		} else {
			t.Fatalf("failed to stat dir: %v", err)
		}
	}
	err := ioutil.WriteFile(fullPath, []byte(contents), 0666)
	if err != nil {
		t.Fatalf("failed to write temp file: %v", err)
	}
	return fullPath, func() {
		if err := os.Remove(fullPath); err != nil && !os.IsNotExist(err) {
			t.Errorf("failed to delete file %q: %v", fullPath, err)
		}
	}
}

func req(handler http.HandlerFunc, url string) (int, string) {
	req := httptest.NewRequest("GET", url, nil)
	w := httptest.NewRecorder()
	handler(w, req)
	resp := w.Result()
	body, _ := ioutil.ReadAll(resp.Body)
	return resp.StatusCode, string(body)
}

func TestDevserverFileHandling(t *testing.T) {
	_, del := tmpfile(t, "TestIndexServing/manifest.MF", "file1.js\nfile2.js")
	defer del()
	_, delIdx := tmpfile(t, "TestIndexServing/pkg1/index.html", "contents of index.html")
	defer delIdx()
	_, del = tmpfile(t, "TestIndexServing/pkg1/foo.html", "contents of foo.html")
	defer del()
	_, del = tmpfile(t, "TestIndexServing/pkg2/bar.html", "contents of bar.html")
	defer del()
	_, del = tmpfile(t, "TestIndexServing/pkg2/foo.html", "contents of foo.html in pkg2")
	defer del()
	_, del = tmpfile(t, "TestIndexServing/pkg2/rpc/items/index.html", "contents of rpc/items/index.html")
	defer del()
	_, del = tmpfile(t, "TestIndexServing/pkg3/baz.html", "contents of baz.html in pkg3")
	defer del()

	handler := CreateFileHandler("/app.js", "manifest.MF", []string{"pkg1", "pkg2"},
		filepath.Join(os.Getenv("TEST_TMPDIR"), "TestIndexServing"))

	tests := []struct {
		code    int
		url     string
		content string
		delIdx  bool
	}{
		// index file from pkg1.
		{http.StatusOK, "/", "contents of index.html", false},
		// index file as a response to not found handler.
		{http.StatusNotFound, "/no/such/dir", "contents of index.html", false},
		// index file as a response to not found handler.
		{http.StatusNotFound, "/no/such/dir/", "contents of index.html", false},
		// index file as a response to a directory that is found.
		{http.StatusNotFound, "/pkg2/", "contents of index.html", false},
		// file from the base package.
		{http.StatusOK, "/foo.html", "contents of foo.html", false},
		// file from the base package with full path.
		{http.StatusOK, "/pkg1/foo.html", "contents of foo.html", false},
		// file from pkg2.
		{http.StatusOK, "/bar.html", "contents of bar.html", false},
		// file from pkg2 with full path.
		{http.StatusOK, "/pkg2/bar.html", "contents of bar.html", false},
		// index file from disk
		{http.StatusOK, "/rpc/items", "contents of rpc/items/index.html", false},
		// file from an unrelated package.
		{http.StatusOK, "/pkg3/baz.html", "contents of baz.html in pkg3", false},
		// generated index for root.
		{http.StatusOK, "/", `<script src="/app.js">`, true},
		// generated index as a response to not found handler.
		{http.StatusNotFound, "/no/such/dir", `<script src="/app.js">`, true},
		// generated index file as a response to a directory that is found.
		{http.StatusNotFound, "/pkg2/", `<script src="/app.js">`, true},
	}

	for _, tst := range tests {
		if tst.delIdx {
			delIdx() // from here on, use the generated index.
		}
		code, body := req(handler, fmt.Sprintf("http://test%s", tst.url))
		if code != tst.code {
			t.Errorf("got %d, expected %d", code, tst.code)
		}
		if !strings.Contains(body, tst.content) {
			t.Errorf("expected %q to contain %q, got %q", tst.url, tst.content, body)
		}
	}
}
