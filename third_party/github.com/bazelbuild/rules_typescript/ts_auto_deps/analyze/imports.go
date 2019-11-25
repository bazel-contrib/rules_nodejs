package analyze

import (
	"io/ioutil"
	"path/filepath"
	"regexp"
	"strings"
	"sync"

	"github.com/bazelbuild/rules_typescript/ts_auto_deps/platform"
	"github.com/bazelbuild/rules_typescript/ts_auto_deps/workspace"
)

// tazeImport represents a single import in a TypeScript source.
type tazeImport struct {
	// importPath can be an ES6 path ('./foo/bar'), but also a namespace ('goog:...').
	// This is the import path as it appears in the TypeScript source.
	importPath string
	// knownTarget is the (fully qualified) blaze target providing importPath.
	// It's either found by locateMissingTargets or taken from a taze comment.
	knownTarget string
	location    sourceLocation
}

// resolvedPath is the path to the import relative to the root of the
// workspace. For example, an import of './foo' in the 'bar/baz' directory
// would have a path from root of 'bar/baz/foo'.
//
// Absolute imports have no resolvedPath since the physical location of
// these imports depends on the dependencies of the target the source
// location is a member of. For example, an import of 'foo/bar' would have
// no resolvedPath.
func (i *tazeImport) resolvedPath() string {
	if strings.HasPrefix(i.importPath, "./") || strings.HasPrefix(i.importPath, "../") {
		// If the import is relative to the source location, use the source
		// location to form a "canonical" path from the root.
		return platform.Normalize(filepath.Clean(filepath.Join(filepath.Dir(i.location.sourcePath), i.importPath)))
	} else if trim := strings.TrimPrefix(i.importPath, workspace.Name()+"/"); trim != i.importPath {
		return trim
	}
	// The import is an absolute import and therefore does not have a definite
	// resolved path.
	return i.importPath
}

// sourceLocation points to a position in a source file.
type sourceLocation struct {
	// Workspace root relative source path.
	sourcePath string
	// offset and length are byte offsets, line is the 1-indexed source line (considering only \n as breaks).
	offset, length, line int
}

// extractAllImports extracts the TypeScript imports from paths.
//
// paths should be relative to root. The root will be joined to each path
// to construct a physical path to each file.
func extractAllImports(root string, paths []string) (map[string][]*tazeImport, []error) {
	debugf("extracting imports from TypeScript files relative to %q: %q", root, paths)
	allImports := make(map[string][]*tazeImport)
	var (
		errors []error
		mutex  sync.Mutex
		group  sync.WaitGroup
	)
	for _, path := range paths {
		group.Add(1)
		go func(path string) {
			defer group.Done()
			imports, err := extractImports(root, path)
			// Lock the mutex to prevent concurrent writes.
			mutex.Lock()
			defer mutex.Unlock()
			if err != nil {
				errors = append(errors, err)
				return
			}
			allImports[path] = imports
		}(path)
	}
	group.Wait()
	return allImports, errors
}

// extractImports extracts the TypeScript imports from a single file. path
// should be a path from the root to the file.
func extractImports(root, path string) ([]*tazeImport, error) {
	d, err := ioutil.ReadFile(filepath.Join(root, path))
	if err != nil {
		return nil, err
	}
	return parseImports(path, d), nil
}

const (
	tazeFrom          = `^[ \t]*//[ \t]+taze:[^\n]*?from[ \t]+(?P<Target>//\S+)$`
	importPreface     = `^[ \t]*(?:import|export)\b\s*`
	wildcardTerm      = `\*(?:\s*as\s+\S+)?` // "as..." is optional to match exports.
	identifiersClause = `(?:\{[^}]*\}|\S+|` + wildcardTerm + `)`
	symbolsTerm       = `(?:` + identifiersClause + `(?:,\s*` + identifiersClause + `)?\s*\bfrom\b\s*)?`
	url               = `['"](?P<URL>[^'";]+)['"]\s*;?`
	namespaceComment  = `(?:\s*//[ \t]*from[ \t]+(?P<Target>//\S+)$)?`
)

var importRE = regexp.MustCompile("(?ms)" +
	"(?:" + tazeFrom + ")|" +
	"(?:" + importPreface + symbolsTerm + url + namespaceComment + ")")

// parseImports scans contents for imports (ES6 modules, taze comments), and
// returns a list of tazeImports. knownTarget is already filled in for imports
// that have taze comments.
func parseImports(sourcePath string, contents []byte) []*tazeImport {
	var imports []*tazeImport
	lastOffset := 0
	line := 1
	column := 1
	for _, matchIndices := range importRE.FindAllSubmatchIndex(contents, -1) {
		imp := &tazeImport{}
		imports = append(imports, imp)
		// matchIndices[0, 1]: full RE match
		imp.location.sourcePath = sourcePath
		for lastOffset < matchIndices[1] {
			// Iterate to the *end* of the import statement.
			// The taze comment must be placed at the end of the "import" statement.
			// This offset has to be exactly the end of the import for taze later on
			// to insert the '// from' comment in the correct line.
			column++
			if contents[lastOffset] == '\n' {
				line++
				column = 1
			}
			lastOffset++
		}
		imp.location.offset = matchIndices[0]
		imp.location.length = matchIndices[1] - matchIndices[0]
		imp.location.line = line
		if matchIndices[2] >= 0 {
			// matchIndices[2, 3]: Target for a // taze: ... from ... comment.
			imp.knownTarget = string(contents[matchIndices[2]:matchIndices[3]])
		} else {
			// matchIndices[4, 5]: URL in import x from 'url';
			imp.importPath = string(contents[matchIndices[4]:matchIndices[5]])
		}
		if matchIndices[6] >= 0 {
			// matchIndices[6, 7]: Target for a // from comment
			imp.knownTarget = string(contents[matchIndices[6]:matchIndices[7]])
		}
	}
	return imports
}
