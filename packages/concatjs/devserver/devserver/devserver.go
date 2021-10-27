// Package devserver provides code shared between Bazel and Blaze.
package devserver

import (
	"bytes"
	"fmt"
	"net"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/bazelbuild/rules_typescript/devserver/runfiles"
)

// Convert Windows paths separators.
var pathReplacer = strings.NewReplacer("\\", "/")

func shouldAllowCors(request *http.Request) bool {
	hostname, err := os.Hostname()
	if err != nil {
		return false
	}
	referer, err := url.Parse(request.Header.Get("Origin"))
	if err != nil {
		return false
	}
	host, _, err := net.SplitHostPort(referer.Host)
	// SplitHostPort fails when the parameter doesn't have a port.
	if err != nil {
		host = referer.Host
	}
	return host == hostname || host == "localhost"
}

func customNotFoundMiddleware(notFound http.HandlerFunc, passThrough http.HandlerFunc) http.HandlerFunc {
	return func(writer http.ResponseWriter, request *http.Request) {
		passThrough(
			&customNotFoundResponseWriter{ResponseWriter: writer, request: request, notFound: notFound},
			request,
		)
	}
}

type customNotFoundResponseWriter struct {
	http.ResponseWriter

	request  *http.Request
	notFound http.HandlerFunc
	has404   bool
	hasWrite bool
}

// Write implements http.ResponseWriter.Write.
func (w *customNotFoundResponseWriter) Write(b []byte) (int, error) {
	w.hasWrite = true
	if w.has404 {
		// We have already written the not found response, so drop this one.
		return len(b), nil
	}
	return w.ResponseWriter.Write(b)
}

// WriteHeader implements http.ResponseWriter.WriteHeader.
func (w *customNotFoundResponseWriter) WriteHeader(code int) {
	if code != http.StatusNotFound || w.hasWrite {
		// We only intercept not found statuses. We also don't intercept statuses written after the
		// first write as these are an error and should be handled by the default ResponseWriter.
		w.ResponseWriter.WriteHeader(code)
		return
	}

	// WriteHeader writes out the entire header (including content type) and only the first call
	// will succeed. Therefore, if we want the correct content type set, we must set it here.
	w.Header().Del("Content-Type")
	w.Header().Add("Content-Type", "text/html; charset=utf-8")
	w.ResponseWriter.WriteHeader(code)
	w.has404 = true

	// We have already written the header, so drop any calls to WriteHeader made by the not found
	// handler. These additional calls are expected, and if passed through, would cause the base
	// ResponseWriter to unnecessarily spam the error log.
	w.notFound(&headerSuppressorResponseWriter{w.ResponseWriter}, w.request)
	w.hasWrite = true
}

type headerSuppressorResponseWriter struct {
	http.ResponseWriter
}

// WriteHeader implements http.ResponseWriter.WriteHeader.
func (w *headerSuppressorResponseWriter) WriteHeader(code int) {}

// CreateFileHandler returns an http handler to locate files on disk
func CreateFileHandler(servingPath, manifest string, pkgs []string, base string) http.HandlerFunc {
	// We want to add the root runfile path because by default developers should be able to request
	// runfiles through their absolute manifest path (e.g. "my_workspace_name/src/file.css")
	pkgPaths := dirHTTPFileSystem{append(pkgs, "./"), base}

	fileHandler := http.FileServer(pkgPaths).ServeHTTP

	defaultPage := []byte(fmt.Sprintf(`<!doctype html>
		<html>
			<head>
				<title>ts_devserver (%s)</title>
			</head>
			<body>
				<script src="%s"></script>
			</body>
		</html>
		`, manifest, servingPath))

	// indexHandler serves an index.html if present, or otherwise serves a minimal
	// generated index.html with a script tag to include the bundled js source.
	indexHandler := func(w http.ResponseWriter, r *http.Request) {
		// search through pkgs for the first index.html file found if any exists
		for _, pkg := range pkgs {
			// File path is not cached, so that a user's edits will be reflected.
			userIndexFile, err := runfiles.Runfile(base, pathReplacer.Replace(filepath.Join(pkg, "index.html")))

			// In case the potential user index file couldn't be found in the runfiles,
			// continue searching within other packages.
			if err != nil {
				continue
			}

			// We can assume that the file is readable if it's listed in the runfiles manifest.
			http.ServeFile(w, r, userIndexFile)
			return
		}
		content := bytes.NewReader(defaultPage)
		http.ServeContent(w, r, "index.html", time.Now(), content)
	}

	// Serve a custom index.html so as to override the default directory listing
	// from http.FileServer when no index.html file present.
	indexOnNotFoundHandler := func(writer http.ResponseWriter, request *http.Request) {
		// The browser can't tell the difference between different source checkouts or different devserver
		// instances, so it may mistakenly cache static files (including templates) using versions from
		// old instances if they haven't been modified more recently. To prevent this, we force no-cache
		// on all static files.
		writer.Header().Add("Cache-Control", "no-cache, no-store, must-revalidate")
		if shouldAllowCors(request) {
			writer.Header().Add("Access-Control-Allow-Origin", request.Header.Get("Origin"))
			writer.Header().Add("Access-Control-Allow-Credentials", "true")
		}
		writer.Header().Add("Pragma", "no-cache")
		writer.Header().Add("Expires", "0")
		// Add gzip headers if serving .gz files.
		if strings.HasSuffix(request.URL.EscapedPath(), ".gz") {
			writer.Header().Add("Content-Encoding", "gzip")
		}

		if request.URL.Path == "/" {
			indexHandler(writer, request)
			return
		}
		// When a file is not found, serve a 404 code but serve the index.html from above as its body.
		// This allows applications to use html5 routing and reload the page at /some/sub/path, but still
		// get their web app served.
		// The responses is marked as an error (404) so that requests that are genuinely wrong (e.g.
		// incorrect URLs for CSS, images, etc) are marked as such. Otherwise they'd seem to succeed but
		// then fail to process correctly, which makes for a bad debugging experience.
		writer = &customNotFoundResponseWriter{ResponseWriter: writer, request: request, notFound: indexHandler}
		fileHandler(writer, request)
	}

	return indexOnNotFoundHandler
}

// dirHTTPFileSystem implements http.FileSystem by looking in the list of dirs one after each other.
type dirHTTPFileSystem struct {
	packageDirs []string
	base        string
}

func (fs dirHTTPFileSystem) Open(name string) (http.File, error) {
	for _, packageName := range fs.packageDirs {
		manifestFilePath := filepath.Join(packageName, name)
		realFilePath, err := runfiles.Runfile(fs.base, manifestFilePath)

		if err != nil {
			// In case the runfile could not be found, we also need to check that the requested
			// path does not refer to a directory containing an "index.html" file. This can
			// happen if Bazel runs without runfile symlinks, where only files can be resolved
			// from the manifest. In that case we dirty check if there is a "index.html" file.
			realFilePath, err = runfiles.Runfile(fs.base, filepath.Join(manifestFilePath, "index.html"))

			// Continue searching if the runfile couldn't be found for the requested file.
			if err != nil {
				continue
			}
		}

		stat, err := os.Stat(realFilePath)
		if err != nil {
			// This should actually never happen because runfiles resolved through the runfile helpers
			// should always exist. Just in order to properly handle the error, we add this error handling.
			return nil, fmt.Errorf("could not read runfile %s", manifestFilePath)
		}

		// In case the resolved file resolves to a directory. This can only happen if
		// Bazel runs with symlinked runfiles (e.g. on MacOS, linux). In that case, we
		// just look for a index.html in the directory.
		if stat.IsDir() {
			realFilePath, err = runfiles.Runfile(fs.base, filepath.Join(manifestFilePath, "index.html"))

			// In case the index.html file of the requested directory couldn't be found,
			// we just continue searching.
			if err != nil {
				continue
			}
		}

		// We can assume that the file is present, if it's listed in the runfile manifest. Though, we
		// return the error, in case something prevented the read-access.
		return os.Open(realFilePath)
	}

	return nil, os.ErrNotExist
}
