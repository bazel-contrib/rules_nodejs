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
	handler := CreateFileHandler("/app.js", "manifest.MF", []string{
		// This verifies that we can resolve relatively to the current package. Usually the
		// devserver Bazel rule adds the current package here.
		"build_bazel_rules_nodejs/packages/concatjs/devserver/devserver",
		// Verifies that we can specify subfolders of workspaces
		"build_bazel_rules_nodejs/packages/concatjs/devserver/devserver/test",
		// Verifies that we can specify external workspaces as root dirs.
		"devserver_test_workspace",
		// Verifies that we can specify subfolders from external workspaces.
		"devserver_test_workspace/pkg2",
	}, "")

	defaultPageContent := `<script src="/app.js">`

	tests := []struct {
		code    int
		url     string
		content string
	}{
		// index file from pkg1.
		{http.StatusOK, "/", "contents of index.html"},
		// index file as a response to not found handler.
		{http.StatusNotFound, "/no/such/dir", "contents of index.html"},
		// index file as a response to not found handler.
		{http.StatusNotFound, "/no/such/dir/", "contents of index.html"},
		// index file as a response to a directory that is found.
		{http.StatusNotFound, "/pkg2/", "contents of index.html"},
		// file from relative to base package.
		{http.StatusOK, "/test/relative.html", "contents of relative.html"},
		// file from the base package with full path.
		{http.StatusOK, "/pkg1/foo.html", "contents of foo.html"},
		// file from pkg2.
		{http.StatusOK, "/bar.html", "contents of bar.html"},
		// file from pkg2 with full path.
		{http.StatusOK, "/pkg2/bar.html", "contents of bar.html"},
		// index file from disk
		{http.StatusOK, "/rpc/items", "contents of rpc/items/index.html"},
		// file from an unrelated package.
		{http.StatusOK, "/pkg3/baz.html", "contents of baz.html in pkg3"},
	}

	for _, tst := range tests {
		code, body := req(handler, fmt.Sprintf("http://test%s", tst.url))
		if code != tst.code {
			t.Errorf("got %d, expected %d", code, tst.code)
		}
		if !strings.Contains(body, tst.content) {
			t.Errorf("expected %q to contain %q, got %q", tst.url, tst.content, body)
		}
		if strings.Contains(body, defaultPageContent) {
			t.Errorf("got %q, default page shouldn't be part of response", body)
		}
	}
}

func TestDevserverGeneratedIndexFile(t *testing.T) {
	handler := CreateFileHandler("/app.js", "manifest.MF", []string{
		"devserver_test_workspace",
	}, "")
	defaultPageContent := `<script src="/app.js">`

	tests := []struct {
		code    int
		url     string
		content string
	}{
		// Assert generated index for root.
		{http.StatusOK, "/", defaultPageContent},
		// Assert generated index as a response to not found handler.
		{http.StatusNotFound, "/no/such/dir", defaultPageContent},
		// Assert index file as a response to a directory that is found, but does not
		// have an index file.
		{http.StatusNotFound, "/pkg2/", defaultPageContent},
	}

	for _, tst := range tests {
		code, body := req(handler, fmt.Sprintf("http://test%s", tst.url))
		if code != tst.code {
			t.Errorf("got %d, expected %d", code, tst.code)
		}
		if !strings.Contains(body, tst.content) {
			t.Errorf("expected %q to contain %q, got %q", tst.url, tst.content, body)
		}
	}
}

func TestDevserverAbsoluteRunfileRequest(t *testing.T) {
	handler := CreateFileHandler("/app.js", "manifest.MF", []string{}, "")

	tests := []struct {
		code    int
		url     string
		content string
	}{
		// Assert that it's possible to request a runfile through it's absolute manifest path.
		{http.StatusOK, "/devserver_test_workspace/pkg2/bar.html", "contents of bar.html"},
		// Assert that it's possible to request a runfile directory through it's absolute manifest path. This
		// should resolve to the directories "index.html" file.
		{http.StatusOK, "/devserver_test_workspace/pkg1", "contents of index.html"},
	}

	for _, tst := range tests {
		code, body := req(handler, fmt.Sprintf("http://test%s", tst.url))
		if code != tst.code {
			t.Errorf("got %d, expected %d", code, tst.code)
		}
		if !strings.Contains(body, tst.content) {
			t.Errorf("expected %q to contain %q, got %q", tst.url, tst.content, body)
		}
	}
}
