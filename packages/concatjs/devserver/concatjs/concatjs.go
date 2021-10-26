// Package concatjs provides a simple way of serving JavaScript sources in development.
package concatjs

import (
	"bufio"
	"bytes"
	"compress/gzip"
	"fmt"
	"io"
	"io/ioutil"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"regexp"
	"strings"
	"sync"
	"time"
)

// ServeConcatenatedJS returns an http.Handler that serves the JavaScript files
// listed in manifestPath in one concatenated, eval separated response body.
//
// This greatly speeds up development load times due to fewer HTTP requests, but
// still for easy debugging by giving the eval'ed fragments URLs through
// sourceURL comments.
//
// Example usage:
//   http.Handle("/app_combined.js",
// 	     concatjs.ServeConcatenatedJS("my/app/web_srcs.MF", ".", [], [], nil))
//
// Relative paths in the manifest are resolved relative to the path given as root.
func ServeConcatenatedJS(manifestPath string, root string, preScripts []string, postScripts []string, fs FileSystem) http.Handler {
	var lock sync.Mutex // Guards cache.
	cache := NewFileCache(root, fs)

	manifestPath = filepath.Join(root, manifestPath)

	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "text/javascript; charset=utf-8")
		files, err := manifestFiles(manifestPath)
		if err != nil {
			w.WriteHeader(http.StatusInternalServerError)
			writeJSError(w, "Failed to read manifest: %v", err)
			return
		}
		var writer io.Writer = w
		if acceptGzip(r.Header) {
			// NB: gzip is not supported in App Engine, as the header is stripped:
			// https://cloud.google.com/appengine/docs/go/requests#Go_Request_headers
			// CompressionLevel = 3 is a reasonable compromise between speed and compression.
			gzw, err := gzip.NewWriterLevel(w, 3)
			if err != nil {
				log.Fatalf("Could not create gzip writer: %s", err)
			}
			defer gzw.Close()
			writer = gzw
			w.Header().Set("Content-Encoding", "gzip")
		}

		// Write out pre scripts
		for _, s := range preScripts {
			fmt.Fprint(writer, s)
			// Ensure scripts are separated by a newline
			fmt.Fprint(writer, "\n")
		}

		// Protect the cache with a lock because it's possible for multiple requests
		// to be handled in parallel.
		lock.Lock()
		cache.WriteFiles(writer, files)
		lock.Unlock()

		// Write out post scripts
		for _, s := range postScripts {
			fmt.Fprint(writer, s)
			// Ensure scripts are separated by a newline
			fmt.Fprint(writer, "\n")
		}
	})
}

var acceptHeader = http.CanonicalHeaderKey("Accept-Encoding")

func acceptGzip(h http.Header) bool {
	for _, hv := range h[acceptHeader] {
		for _, enc := range strings.Split(hv, ",") {
			if strings.TrimSpace(enc) == "gzip" {
				return true
			}
		}
	}
	return false
}

// FileSystem is the interface to reading files from disk.
// It's abstracted into an interface to allow tests to replace it.
type FileSystem interface {
	StatMtime(filename string) (time.Time, error)
	ReadFile(filename string) ([]byte, error)
	ResolvePath(root string, file string) (string, error)
}

// RealFileSystem implements FileSystem by actual disk access.
type RealFileSystem struct{}

// StatMtime gets the last modification time of the specified file.
func (fs *RealFileSystem) StatMtime(filename string) (time.Time, error) {
	s, err := os.Stat(filename)
	if err != nil {
		return time.Time{}, err
	}
	return s.ModTime(), nil
}

// ReadFile reads the specified file using the real filesystem.
func (fs *RealFileSystem) ReadFile(filename string) ([]byte, error) {
	return ioutil.ReadFile(filename)
}

// ResolvePath resolves the specified path within a given root by joining root and the filepath.
// This is only works if the specified file is located within the given root in the
// real filesystem. This does not work in Bazel where requested files aren't always
// located within the specified root. Files would need to be resolved as runfiles.
func (fs *RealFileSystem) ResolvePath(root string, file string) (string, error) {
	return filepath.Join(root, file), nil
}

// FileCache caches a set of files in memory and provides a single
// method, WriteFiles(), that streams them out in the concatjs format.
type FileCache struct {
	fs   FileSystem
	root string

	entries map[string]*cacheEntry
}

// NewFileCache constructs a new FileCache.  Relative paths in the cache
// are resolved relative to root.  fs injects file system access, and
// will use the real file system if nil.
func NewFileCache(root string, fs FileSystem) *FileCache {
	if fs == nil {
		fs = &RealFileSystem{}
	}
	return &FileCache{
		root:    root,
		fs:      fs,
		entries: map[string]*cacheEntry{},
	}
}

type cacheEntry struct {
	// err holds an error encountered while updating the entry; if
	// it's non-nil, then mtime, contents and the resolved path are invalid.
	err          error
	mtime        time.Time
	contents     []byte
	resolvedPath string
}

// manifestFiles parses a manifest, returning a list of the files in the manifest.
// It skips blank lines and javascript/closure/deps.js.
func manifestFiles(manifest string) ([]string, error) {
	f, err := os.Open(manifest)
	if err != nil {
		return nil, fmt.Errorf("could not read manifest %s: %s", manifest, err)
	}
	defer f.Close()
	return manifestFilesFromReader(f)
}

// manifestFilesFromReader is a helper for manifestFiles, split out for testing.
func manifestFilesFromReader(r io.Reader) ([]string, error) {
	var lines []string
	s := bufio.NewScanner(r)
	for s.Scan() {
		path := s.Text()
		if path == "" {
			continue
		}
		if path == "javascript/closure/deps.js" {
			// Ignore/skip deps.js, it is unused due to CLOSURE_NO_DEPS = true and superseded by the
			// dependency handling in this file. It's harmless, but a large download (>450 KB).
			continue
		}
		lines = append(lines, path)
	}
	if err := s.Err(); err != nil {
		return nil, err
	}

	return lines, nil
}

// writeJSError writes an error both to the log and into w as a JavaScript throw statement.
func writeJSError(w io.Writer, format string, a ...interface{}) {
	log.Printf(format, a...)
	fmt.Fprint(w, "throw new Error('")
	fmt.Fprintf(w, format, a...)
	fmt.Fprint(w, "');\n")
}

// WriteFiles updates the cache for a list of files, then streams them into an io.Writer.
func (cache *FileCache) WriteFiles(w io.Writer, files []string) error {
	// Ensure the cache is up to date with respect to the on-disk state.
	// Note that refreshFiles cannot fail; any errors encountering while refreshing
	// are stored in the cache entry and streamed into the response.
	cache.refreshFiles(files)

	for _, path := range files {
		if _, err := fmt.Fprintf(w, "// %s\n", path); err != nil {
			return err
		}
		ce := cache.entries[path]
		if ce.err != nil {
			writeJSError(w, "loading %s failed: %s", path, ce.err)
			continue
		}
		if _, err := w.Write(ce.contents); err != nil {
			return err
		}
	}
	return nil
}

// refresh ensures a single cacheEntry is up to date.  It stat()s and
// potentially reads the contents of the file it is caching.
func (e *cacheEntry) refresh(fs FileSystem) error {
	mt, err := fs.StatMtime(e.resolvedPath)
	if err != nil {
		return err
	}
	if e.mtime == mt && e.contents != nil {
		return nil // up to date
	}

	contents, err := fileContents(e.resolvedPath, fs)
	if err != nil {
		return err
	}
	e.mtime = mt
	e.contents = contents
	return nil
}

// Convert Windows paths separators. We can use this to create canonical paths that
// can be also used as browser source urls.
var pathReplacer = strings.NewReplacer("\\", "/")

// refreshFiles stats the given files and updates the cache for them.
func (cache *FileCache) refreshFiles(files []string) {
	// Stating many files asynchronously is faster on network file systems.
	// Push all files that need to be stat'd into a channel and have
	// a set of workers stat/read them to update the cache entry.
	type workItem struct {
		path  string
		entry *cacheEntry
	}
	work := make(chan workItem)

	var wg sync.WaitGroup
	wg.Add(len(files))
	for i := 0; i < len(files); i++ {
		// TODO(evanm): benchmark limiting this to fewer goroutines.
		go func() {
			w := <-work
			w.entry.err = w.entry.refresh(cache.fs)
			wg.Done()
		}()
	}

	for _, path := range files {
		entry := cache.entries[path]
		if entry == nil {
			// Resolve path only once for a cache entry. The resolved path will be part of the
			// cache item.
			resolvedPath, err := cache.fs.ResolvePath(cache.root, path)

			if err != nil {
				fmt.Fprintf(os.Stderr, "could not resolve path %s. %v\n", path, err)
				os.Exit(1)
			}

			// Create a new cache entry with the corresponding resolved path. Also normalize the path
			// before storing it persistently in the cache. The normalizing is good to do here because
			// the path might be used in browser source URLs and should be kept in posix format.
			entry = &cacheEntry{
				resolvedPath: pathReplacer.Replace(resolvedPath),
			}
			cache.entries[path] = entry
		}
		work <- workItem{path, entry}
	}
	close(work)

	wg.Wait()
}

// The maximum number of bytes of a source file to be searched for the "goog.module" declaration.
// Limited to 50,000 bytes to avoid degenerated performance on large compiled JS (e.g. a
// pre-compiled AngularJS binary).
const googModuleSearchLimit = 50 * 1000

// Matches files containing "goog.module", which have to be served slightly differently.
var googModuleRegExp = regexp.MustCompile(`(?m)^\s*goog\.module\s*\(\s*['"]`)

// fileContents returns escaped JS file contents for the given path.
func fileContents(path string, fs FileSystem) ([]byte, error) {
	contents, err := fs.ReadFile(path)
	if err != nil {
		return nil, err
	}
	var f bytes.Buffer
	// goog.module files must be wrapped in a goog.loadModule call. Check the first X bytes of the file for it.
	limit := googModuleSearchLimit
	if len(contents) < limit {
		limit = len(contents)
	}
	if googModuleRegExp.Match(contents[:limit]) {
		fmt.Fprint(&f, "goog.loadModule('")
	} else {
		fmt.Fprint(&f, "eval('")
	}
	if err := writeJSEscaped(&f, contents); err != nil {
		log.Printf("Failed to write file contents of %s: %s", path, err)
		return nil, err
	}
	fmt.Fprintf(&f, "\\n\\n//# sourceURL=http://concatjs/%s\\n');\n", path)

	return f.Bytes(), nil
}

// writeJSEscaped writes contents into the given writer, escaping for content in
// a single quoted JavaScript string.
func writeJSEscaped(out io.Writer, contents []byte) error {
	// template.JSEscape escapes whitespace and line breaks to bulky six-character
	// escapes, substantially blowing up response size, and is also a bit slower.
	// As this also doesn't need safe escaping, this code just rather escapes itself.
	for _, b := range contents {
		switch b {
		case '\n':
			if _, err := out.Write([]byte("\\n")); err != nil {
				return err
			}
		case '\r':
			if _, err := out.Write([]byte("\\r")); err != nil {
				return err
			}
		case '\\', '\'':
			if _, err := out.Write([]byte{'\\'}); err != nil {
				return err
			}
			fallthrough
		default:
			if _, err := out.Write([]byte{b}); err != nil {
				return err
			}
		}
	}
	return nil
}
