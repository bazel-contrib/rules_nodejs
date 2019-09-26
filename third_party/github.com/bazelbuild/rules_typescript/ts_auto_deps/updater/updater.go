// Package updater implements the main logic of the ts_auto_deps command. It reads BUILD files,
// discovers TypeScript sources, uses `bazel analyze` to update import/dependency information,
// and then modifies the BUILD file accordingly.
package updater

import (
	"bytes"
	"context"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"regexp"
	"sort"
	"strconv"
	"strings"
	"sync"
	"time"

	"flag"
	"github.com/bazelbuild/buildtools/build"
	"github.com/bazelbuild/buildtools/edit"
	"github.com/bazelbuild/rules_typescript/ts_auto_deps/analyze"
	"github.com/bazelbuild/rules_typescript/ts_auto_deps/platform"
	"github.com/bazelbuild/rules_typescript/ts_auto_deps/workspace"
	"github.com/golang/protobuf/proto"
	"github.com/mattn/go-isatty"

	arpb "github.com/bazelbuild/rules_typescript/ts_auto_deps/proto"
)

var bazelErrorRE = regexp.MustCompile(`ERROR: ([^:]+):(\d+):\d+:`)

// New creates a new updater from the given arguments. One updater can be used
// to update many packages, repeatedly, but not concurrently.
// bazelAnalyze and updateFile can be passed in to handle ts_auto_deps operation in
// different environments and for fakes in tests.
func New(removeUnusedDeclarations bool, updateComments bool, bazelAnalyze BazelAnalyzer, updateFile UpdateFile) *Updater {
	return &Updater{removeUnusedDeclarations, updateComments, bazelAnalyze, updateFile}
}

// UpdateFile updates the contents of filePath. Implementations may postpone or batch actually writing the given file, i.e.
// a subsequent read may return stale contents.
type UpdateFile func(ctx context.Context, filePath string, contents string) error

// LocalUpdateFile simply writes to the given file.
func LocalUpdateFile(ctx context.Context, filePath string, contents string) error {
	return platform.WriteFile(ctx, filePath, []byte(contents))
}

// BazelAnalyzer is a function that executes bazel analyze for the given
// absolute build file path and bazel targets, and returns the raw analysis
// result proto, or an error if the analyze call failed.
// It's used to abstract over execution using rabbit vs local execution.
// Returns the main output (serialized AnalysisResult proto), any error
// messages, or an error.
type BazelAnalyzer func(buildFilePath string, targets []string) ([]byte, []byte, error)

// Updater encapsulates configuration for the ts_auto_deps process.
type Updater struct {
	removeUnusedDeclarations bool
	updateComments           bool
	bazelAnalyze             BazelAnalyzer
	updateFile               UpdateFile
}

func attrTruthy(r *build.Rule, attr string) bool {
	attrVal := r.AttrLiteral(attr)
	return attrVal == "True" || attrVal == "1"
}

// Matches the warning TypeScriptRuleChecker prints for unused ts_declarations.
// TODO(martinprobst): in the long term, this should become the default and TypeScriptRuleChecker should no longer special case ts_declaration.
var unusedDeclarationRE = regexp.MustCompile(
	`WARNING: [^:]+:\d+:(?:\d+:)? keeping possibly used ts_declaration '([^']+)'`)

// GarbledBazelResponseError signals to callers that the proto returned by bazel
// analyze was garbled, and couldn't be unmarshalled.
// TODO(lucassloan): remove when b/112891536 is fixed
// Build Rabbit rewrites paths produced by bazel, which garbles the error
// messages from bazel analyze, since they're encoded in protobufs.
type GarbledBazelResponseError struct {
	Message string
}

func (g *GarbledBazelResponseError) Error() string {
	return g.Message
}

// runBazelAnalyze executes the `bazel analyze` command and extracts reports.
// It returns the dependency report with rule names referring to rules *before*
// macro expansion, or an error. runBazelAnalyze uses the given `analyze`
// function to actually run the `bazel analyze` operation, which allows
// exchanging it for a different implementation in the ts_auto_deps presubmit service.
func (upd *Updater) runBazelAnalyze(buildFilePath string, bld *build.File, rules []*build.Rule) ([]*arpb.DependencyReport, error) {
	var targets []string
	for _, r := range rules {
		fullTarget := AbsoluteBazelTarget(bld, r.Name())
		targets = append(targets, fullTarget)
	}
	out, stderr, err := upd.bazelAnalyze(buildFilePath, targets)
	if err != nil {
		return nil, err
	}

	var res arpb.AnalyzeResult
	if err := proto.Unmarshal(out, &res); err != nil {
		// TODO(lucassloan): remove when b/112891536 is fixed
		// Build Rabbit rewrites paths produced by bazel, which garbles the error
		// messages from bazel analyze, since they're encoded in protobufs.
		return nil, &GarbledBazelResponseError{fmt.Sprintf("failed to unmarshal analysis result: %v\nin: %q", err, string(out))}
	}
	platform.Infof("analyze result %v", res)
	reports := res.GetDependencyReport()
	if len(targets) != len(reports) {
		if len(stderr) > 0 {
			// TODO(b/73321854): pretend second rule has a syntactical error, so bazel analyze produces no
			// report for it, but also doesn't return an error code. Remove workaround once fixed.
			return nil, fmt.Errorf("parsing reports failed (%d reports for %s):\n%s",
				len(reports), targets, stderr)
		}
		return nil, fmt.Errorf("parsing reports failed (%d reports for %s) in output: %s",
			len(reports), targets, out)
	}
	if upd.removeUnusedDeclarations {
		for _, report := range reports {
			for _, fb := range report.GetFeedback() {
				m := unusedDeclarationRE.FindStringSubmatch(fb)
				if m == nil {
					continue
				}
				target := m[1]
				platform.Infof("Removing (possibly) unused ts_declaration dependency %q", target)
				// TODO(martinprobst): this warning is to educate users after changing removeUnusedDeclarations to true by default.
				// Once existing code is fixed, this constitutes normal operation, and the logging below should be dropped.
				fmt.Fprintf(os.Stderr, "WARNING: removing apparently unused ts_declaration() dependency from %q.\n", report.GetRule())

				report.UnnecessaryDependency = append(report.UnnecessaryDependency, target)
			}
		}
	}
	return reports, nil
}

func spin(prefix string) chan<- struct{} {
	done := make(chan struct{})
	// Check for cygwin, important for Windows compatibility
	if !isatty.IsTerminal(os.Stderr.Fd()) || !isatty.IsCygwinTerminal(os.Stdout.Fd()) {
		return done
	}
	go func() {
		// Wait a bit before starting to print to avoid flashing a spinner unnecessarily.
		time.Sleep(100 * time.Millisecond)
		ticker := time.NewTicker(100 * time.Millisecond)
		defer ticker.Stop()
		i := 0
		str := []rune(`⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏`)
		for {
			select {
			case <-done:
				fmt.Fprint(os.Stderr, "\r")
				for i := 0; i < len(prefix)+2; i++ {
					fmt.Fprint(os.Stderr, " ")
				}
				fmt.Fprint(os.Stderr, "\r")
				return
			case <-ticker.C:
				fmt.Fprintf(os.Stderr, "\r%s %s", prefix, string(str[i]))
				i = (i + 1) % len(str)
			}
		}
	}()
	return done
}

// readBUILD loads the BUILD file, if present, or returns a nil pointer, if not.
// buildFilePath is relative to CWD, and workspaceRelativePath is relative to
// the workspace root (the directory containing the WORKSPACE file).
func readBUILD(ctx context.Context, buildFilePath, workspaceRelativePath string) (*build.File, error) {
	data, err := platform.ReadFile(ctx, buildFilePath)
	if err != nil {
		if os.IsNotExist(err) {
			return nil, nil
		}
		return nil, err
	}
	bld, err := build.ParseBuild(workspaceRelativePath, data)
	if err != nil {
		if parseErr, ok := err.(build.ParseError); ok {
			return nil, &AnalysisFailedError{
				[]AnalysisFailureCause{
					AnalysisFailureCause{
						Message: parseErr.Error(),
						Path:    parseErr.Filename,
						Line:    parseErr.Pos.Line,
					},
				},
			}

		}

		// wasn't an error we know how to parse
		return nil, err
	}
	return bld, nil
}

type srcSet map[string]bool

type globResult struct {
	srcs srcSet
	err  error
}

// globSources finds sources in path with any of the given extensions.
// It also filters out temporary files, dangling symlinks, and symlinks into bazel-bin specifically.
// It returns file names relative to path.
func globSources(ctx context.Context, path string, extensions []string) (srcSet, error) {
	var allSourcePaths []string
	for _, extension := range extensions {
		pattern := "*." + extension
		matched, err := platform.Glob(ctx, filepath.Join(path, pattern))
		if err != nil {
			return nil, fmt.Errorf("glob(%s): %s", pattern, err)
		}
		allSourcePaths = append(allSourcePaths, matched...)
	}
	srcs := make(srcSet)
	for _, p := range allSourcePaths {
		fileName := filepath.Base(p)
		if isTempFile(fileName) {
			continue // Ignore editor swap/backup files.
		}
		// Try platform.Stat as a fallback, for Google file systems.
		_, err := platform.Stat(ctx, p)
		if os.IsNotExist(err) {
			platform.Infof("platform.Glob returned non-existent file (dangling symlink?). Ignoring %q.", p)
			continue
		}
		if err != nil {
			return nil, fmt.Errorf("cannot stat platform.Glob result %q: %v", p, err)
		}
		isMpeg, err := IsMpegTS(ctx, p)
		if err != nil {
			return nil, err
		}
		if isMpeg {
			continue
		}
		p, err := filepath.Rel(path, p)
		if err != nil {
			return nil, fmt.Errorf("filepath.Rel(%s, %s): %v", path, p, err)
		}
		srcs[p] = true
	}
	return srcs, nil
}

// IsMpegTS checks if a ".ts" file is an MPEG transport stream.  Taze shouldn't
// treat them as TypeScript files.
func IsMpegTS(ctx context.Context, path string) (bool, error) {
	var content [200]byte
	n, err := platform.ReadBytesFromFile(ctx, path, content[:])
	if err != nil && err != io.EOF {
		return false, err
	}

	// MPEG TS' frame format starts with 0x47 every 189 bytes - detect that and return.
	isMpeg := n > 188 && content[0] == 0x47 && content[188] == 0x47
	return isMpeg, nil
}

func isTempFile(fileName string) bool {
	return strings.HasPrefix(fileName, ".") || strings.HasSuffix(fileName, ".swp") ||
		strings.HasSuffix(fileName, "~")
}

// updateSources adds any srcs that are not in some rule to the last ts_* rule
// in the package, or create a new rule for them.
func updateSources(bld *build.File, srcs srcSet) {
	removeSourcesUsed(bld, "ts_library", "srcs", srcs)
	removeSourcesUsed(bld, "ts_declaration", "srcs", srcs)

	if len(srcs) == 0 {
		return
	}

	// Sort the remaining sources for reproducibility (sadly Go has no LinkedHashSet)
	var srcSlice []string
	for s := range srcs {
		srcSlice = append(srcSlice, s)
	}
	sort.Strings(srcSlice)

	pkgName := filepath.Base(filepath.Dir(bld.Path))
	platform.Infof("Adding new sources to targets in %q: %q", pkgName, srcSlice)
	for _, s := range srcSlice {
		var r *build.Rule
		ruleName := pkgName
		if strings.HasSuffix(s, ".d.ts") {
			r = getOrCreateRule(bld, ruleName+"_dts", "ts_declaration", ruleTypeRegular)
		} else {
			rt := determineRuleType(bld.Path, s)
			r = getOrCreateRule(bld, ruleName, "ts_library", rt)
		}
		addToSrcsClobbering(bld, r, s)
	}
}

// Adds the given value to the srcs attribute on the build rule. Clobbers any
// existing values for srcs that are not a list.
func addToSrcsClobbering(bld *build.File, r *build.Rule, s string) {
	value := r.Attr("srcs")
	switch value.(type) {
	case nil, *build.ListExpr:
		// expected - a list of files (labels) or absent.
	default:
		// Remove any glob calls, variables, etc. ts_auto_deps uses explicit source lists.
		fmt.Fprintf(os.Stderr, "WARNING: clobbering non-list srcs attribute on %s\n",
			AbsoluteBazelTarget(bld, r.Name()))
		r.DelAttr("srcs")
	}
	val := &build.StringExpr{Value: s}
	edit.AddValueToListAttribute(r, "srcs", "", val, nil)
}

var testingRegexp = regexp.MustCompile(`\btesting\b`)

func determineRuleType(path, s string) ruleType {
	if strings.HasSuffix(s, "_test.ts") || strings.HasSuffix(s, "_test.tsx") {
		return ruleTypeTest
	}

	return ruleTypeRegular
}

// AnalysisFailedError is returned by ts_auto_deps when the underlying analyze operation
// fails, e.g. because the BUILD files have syntactical errors.
type AnalysisFailedError struct {
	Causes []AnalysisFailureCause
}

// AnalysisFailureCause gives (one of) the reasons analysis failed, along with
// the path and line that caused the failure (if available).
type AnalysisFailureCause struct {
	Message string
	// workspace path of the file on which analysis failed ie foo/bar/baz.ts, not
	// starting with google3/
	Path string
	// 1-based line on which analysis failed
	Line int
}

func (a *AnalysisFailedError) Error() string {
	var messages []string
	for _, c := range a.Causes {
		messages = append(messages, c.Message)
	}
	return strings.Join(messages, "\n")
}

// updateDeps adds missing dependencies and removes unnecessary dependencies
// for the targets in the given DependencyReports to the build rules in bld.
func updateDeps(bld *build.File, reports []*arpb.DependencyReport) error {
	// First, check *all* reports on whether they were successful, so that users
	// get the complete set of errors at once.
	var errors []AnalysisFailureCause
	for _, report := range reports {
		if !report.GetSuccessful() {
			for _, fb := range report.GetFeedback() {
				msg := fmt.Sprintf("dependency analysis failed for %s:\n%s",
					report.GetRule(), fb)

				m := bazelErrorRE.FindStringSubmatch(fb)
				if m == nil {
					// error message didn't contain file and line number, so just use the
					// path of the BUILD file that was analyzed
					errors = append(errors, AnalysisFailureCause{Message: msg, Path: bld.Path})
					continue
				}

				file := m[1]
				line, err := strconv.Atoi(m[2])
				if err != nil {
					return err
				}

				errors = append(errors, AnalysisFailureCause{msg, file, line})
			}
		}
	}
	if len(errors) > 0 {
		return &AnalysisFailedError{errors}
	}

	pkg := filepath.Dir(bld.Path)
	for _, report := range reports {
		platform.Infof("Applying report: %s", report.String())
		fullTarget := report.GetRule()
		targetName := fullTarget[strings.LastIndex(fullTarget, ":")+1:]
		r := edit.FindRuleByName(bld, targetName)
		if r == nil {
			return fmt.Errorf("could not find rule from report %v", targetName)
		}
		for _, md := range report.MissingDependencyGroup {
			for _, d := range md.Dependency {
				d = AbsoluteBazelTarget(bld, d)
				if d == fullTarget {
					return &AnalysisFailedError{
						[]AnalysisFailureCause{
							AnalysisFailureCause{
								Message: fmt.Sprintf("target %s depends on itself. "+
									"Maybe you have an incorrect `// from %s` comment, or need to split application "+
									"entry point (main.ts) and ng_module() rule?", d, d),
								Path: bld.Path,
							},
						},
					}
				}
				platform.Infof("Adding dependency on %s to %s\n", d, fullTarget)
				addDep(bld, r, d)
			}
		}
		hadUnresolved := len(report.UnresolvedImport) > 0
		if hadUnresolved {
			return &AnalysisFailedError{
				[]AnalysisFailureCause{
					AnalysisFailureCause{
						Message: fmt.Sprintf("ERROR in %s: unresolved imports %s.\nMaybe you are missing a "+
							"'// from ...'' comment, or the target BUILD files are incorrect?\n%s\n",
							fullTarget, report.UnresolvedImport, strings.Join(report.GetFeedback(), "\n")),
						Path: bld.Path,
					},
				},
			}
		}
		for _, d := range report.UnnecessaryDependency {
			platform.Infof("Removing dependency on %s from %s\n", d, fullTarget)
			edit.ListAttributeDelete(r, "deps", d, pkg)
		}
		for _, s := range report.MissingSourceFile {
			platform.Infof("Removing missing source %s from %s\n", s, fullTarget)
			edit.ListAttributeDelete(r, "srcs", s, pkg)
		}
	}
	return nil
}

// maybeWriteBUILD checks if the given file needs updating, i.e. whether the
// canonical serialized form of bld has changed from the file contents on disk.
// If so, writes the file and returns true, returns false otherwise.
func (upd *Updater) maybeWriteBUILD(ctx context.Context, path string, bld *build.File) (bool, error) {
	ri := &build.RewriteInfo{}
	build.Rewrite(bld, ri)
	platform.Infof("Formatted %s: %s\n", path, ri)
	newContent := build.Format(bld)
	oldContent, err := platform.ReadFile(ctx, path)
	if err != nil {
		if !os.IsNotExist(err) {
			return false, err
		} else if len(newContent) == 0 {
			// The BUILD file does not exist, and the newly created file has no content.
			// Treat this as equivalent, and do not create a new BUILD file.
			return false, nil
		}
		// Fall through to write a new file.
	} else if bytes.Equal(oldContent, newContent) {
		// Compare contents, only update if changed.
		return false, nil
	}
	if err := upd.updateFile(ctx, path, string(newContent)); err != nil {
		return false, fmt.Errorf("failed to update %q: %v", path, err)
	}
	return true, nil
}

// getWorkspaceRelativePath takes a buildFilePath that's relative to the working
// directory, and returns a path to the BUILD file that's relative to the
// workspaceRoot (the absolute path of the directory containing the WORKSPACE
// file).
func getWorkspaceRelativePath(workspaceRoot, buildFilePath string) (string, error) {
	absPath, err := filepath.Abs(buildFilePath)
	if err != nil {
		return "", err
	}
	workspaceRelativePath, err := filepath.Rel(workspaceRoot, absPath)
	if err != nil {
		return "", err
	}
	platform.Normalize(workspaceRelativePath)

	return workspaceRelativePath, nil
}

// getBUILDPath takes in a package or BUILD file path, and returns the path of
// the workspace root (the absolute path of the directory containing the
// WORKSPACE file), the BUILD file path relative to the working directory, and
// the BUILD file path relative to the workspace root.
func getBUILDPath(ctx context.Context, path string) (string, string, string, error) {
	path = strings.TrimSuffix(path, "/BUILD") // Support both package paths and BUILD files
	if _, err := platform.Stat(ctx, path); os.IsNotExist(err) {
		return "", "", "", err
	}
	buildFilePath := filepath.Join(path, "BUILD")
	workspaceRoot, err := workspace.Root(buildFilePath)
	if err != nil {
		return "", "", "", err
	}

	workspaceRelativePath, err := getWorkspaceRelativePath(workspaceRoot, buildFilePath)
	if err != nil {
		return "", "", "", err
	}

	return workspaceRoot, buildFilePath, workspaceRelativePath, nil
}

// isTazeDisabledInPackage checks the BUILD file, or if the BUILD doesn't exist,
// the nearest ancestor BUILD file for a disable_ts_auto_deps() rule.
func isTazeDisabledInPackage(ctx context.Context, g3root, buildFilePath, workspaceRelativePath string, bld *build.File) (bool, error) {
	if bld == nil {
		// Make sure ts_auto_deps hasn't been disabled in the next closest ancestor package.
		ancestor, err := FindBUILDFile(ctx, make(map[string]*build.File), g3root, filepath.Dir(workspaceRelativePath))
		if _, ok := err.(*noAncestorBUILDError); ok {
			platform.Infof("Could not find any ancestor BUILD for %q, continuing with a new BUILD file",
				buildFilePath)
			return false, nil
		} else if err != nil {
			return false, err
		} else if buildHasDisableTaze(ancestor) {
			fmt.Printf("ts_auto_deps disabled below %q\n", ancestor.Path)
			return true, nil
		} else {
			platform.Infof("BUILD file missing and ts_auto_deps is enabled below %q. Creating new BUILD file.",
				ancestor.Path)
			return false, nil
		}
	}

	if buildHasDisableTaze(bld) {
		fmt.Printf("ts_auto_deps disabled on %q\n", buildFilePath)
		return true, nil
	}

	return false, nil
}

// SubdirectorySourcesError is returned when ts_auto_deps detects a BUILD file
// that references sources in another directory, either in the directory
// being ts_auto_depsd, or in a super directory.
type SubdirectorySourcesError struct{}

func (a *SubdirectorySourcesError) Error() string {
	return "ts_auto_deps doesn't handle referencing sources in another directory " +
		"- to use ts_auto_deps, migrate to having a BUILD file in every directory. " +
		"For more details, see go/ts_auto_deps#subdirectory-sources"
}

// hasSubdirectorySources checks if the BUILD file has ts_libraries that contain
// source files from subdirectories of the directory with the BUILD. ie foo/BUILD
// has a src foo/bar/baz.ts, in the subdirectory foo/bar.
func hasSubdirectorySources(bld *build.File) bool {
	for _, rule := range buildRules(bld, "ts_library") {
		srcs := rule.AttrStrings("srcs")
		if srcs != nil {
			for _, s := range srcs {
				if strings.Contains(s, "/") {
					return true
				}
			}
		} else {
			// srcs wasn't a list, check for a glob over subdirectory soruces
			srcExp := rule.Attr("srcs")
			call, ok := srcExp.(*build.CallExpr)
			if ok {
				callName, ok := call.X.(*build.Ident)
				if ok {
					if callName.Name == "glob" {
						for _, arg := range call.List {
							strArg, ok := arg.(*build.StringExpr)
							if ok && strings.Contains(strArg.Value, "/") {
								return true
							}
						}
					}
				}
			}
		}
		// TODO(b/120783741):
		// This only handles a lists of files, and a single glob, there are other
		// cases such as a glob + a list of files that it doesn't handle, but that's
		// ok since, this is only meant as a caution to the user.
	}

	return false
}

// directoryOrAncestorHasSubdirectorySources checks for ts_libraries referencing sources in subdirectories.
// It checks the current directory's BUILD if it exists, otherwise it checks the nearest
// ancestor package.
func directoryOrAncestorHasSubdirectorySources(ctx context.Context, g3root, workspaceRelativePath string, bld *build.File) (bool, error) {
	if bld == nil {
		// Make sure the next closest ancestor package doesn't reference sources in a subdirectory.
		ancestor, err := FindBUILDFile(ctx, make(map[string]*build.File), g3root, filepath.Dir(workspaceRelativePath))
		if _, ok := err.(*noAncestorBUILDError); ok {
			// couldn't find an ancestor BUILD, so there aren't an subdirectory sources
			return false, nil
		} else if err != nil {
			return false, err
		} else if hasSubdirectorySources(ancestor) {
			return true, nil
		} else {
			// there was an ancestor BUILD, but it didn't reference subdirectory sources
			return false, nil
		}
	}

	if hasSubdirectorySources(bld) {
		return true, nil
	}

	return false, nil
}

func (upd *Updater) addSourcesToBUILD(ctx context.Context, path string, buildFilePath string, bld *build.File, srcs srcSet) (bool, error) {

	platform.Infof("Updating sources")
	if len(srcs) == 0 && len(allTSRules(bld)) == 0 {
		// No TypeScript rules/sources, no need to update anything
		return false, nil
	}
	updateSources(bld, srcs)

	return upd.maybeWriteBUILD(ctx, buildFilePath, bld)
}

// updateBUILDAfterBazelAnalyze applies the BUILD file updates that depend on bazel
// analyze's DependencyReports, most notably updating any rules' deps.
func (upd *Updater) updateBUILDAfterBazelAnalyze(ctx context.Context, isRoot bool,
	g3root string, buildFilePath string, bld *build.File, reports []*arpb.DependencyReport) (bool, error) {
	platform.Infof("Updating deps")
	if err := updateDeps(bld, reports); err != nil {
		return false, err
	}

	platform.Infof("Setting library rule kinds")
	if err := setLibraryRuleKinds(ctx, buildFilePath, bld); err != nil {
		return false, err
	}
	return upd.maybeWriteBUILD(ctx, buildFilePath, bld)
}

// IsTazeDisabledForDir checks if ts_auto_deps is disabled in the BUILD file in the dir,
// or if no BUILD file exists, in the closest ancestor BUILD
func IsTazeDisabledForDir(ctx context.Context, dir string) (bool, error) {
	g3root, buildFilePath, workspaceRelativePath, err := getBUILDPath(ctx, dir)
	if err != nil {
		return false, err
	}

	bld, err := readBUILD(ctx, buildFilePath, workspaceRelativePath)
	if err != nil {
		platform.Infof("Error reading building file!")
		return false, err
	}

	return isTazeDisabledInPackage(ctx, g3root, buildFilePath, workspaceRelativePath, bld)
}

// CantProgressAfterWriteError reports that ts_auto_deps was run in an environment
// where it can't make writes to the file system (such as when ts_auto_deps is running
// as a service for cider) and the writes it made need to be visible to bazel analyze,
// so it can continue updating the BUILD file(s).  In such a case, the caller should
// collect the writes using a custom UpdateFile function, and re-call ts_auto_deps after
// applying the writes.
type CantProgressAfterWriteError struct{}

func (a *CantProgressAfterWriteError) Error() string {
	return "running ts_auto_deps in a non-writable environment, can't continue until writes are applied"
}

// UpdateBUILDOptions bundles options for the UpdateBUILD function.
type UpdateBUILDOptions struct {
	// InNonWritableEnvironment boolean indicates to ts_auto_deps that the writes it makes
	// won't be immediately visible to bazel analyze, so it cannot proceed normally.
	// In this case, if it makes a write that needs to be visible to bazel analyze, it
	// will return a CantProgressAfterWriteError, which indicates that the caller
	// should apply the writes made to its UpdateFile function, and re-call UpdateBUILD
	// after the writes have been applied.
	InNonWritableEnvironment bool
	// IsRoot indicates that the directory is a project's root directory, so a tsconfig
	// rule should be created.
	IsRoot bool
}

// LatencyReport contains timing measurements of the functions that are called
// when running the presubmit on a package without any TypeScript (since we
// return early to avoid the latency of RAS analyze).
type LatencyReport struct {
	GetBUILD, TazeDisabled, SubdirSrcs, AddSrcs time.Duration
}

// UpdateBUILD drives the main process of creating/updating the BUILD file
// underneath path based on the available sources. Returns true if it modified
// the BUILD file, false if the BUILD file was up to date already. bazelAnalyze
// is used to run the underlying `bazel analyze` process.  Returns another
// boolean that's true iff the package doesn't contain any TypeScript (source
// files or BUILD rules).
func (upd *Updater) UpdateBUILD(ctx context.Context, path string, options UpdateBUILDOptions) (bool, *LatencyReport, error) {
	latencyReport := &LatencyReport{}

	// asynchronously glob for TS sources in the package, since it can be slow on
	// a network file system.
	globChan := make(chan globResult)
	go func() {
		platform.Infof("Globbing TS sources in %s", path)
		srcs, err := globSources(ctx, path, []string{"ts", "tsx"})
		globChan <- globResult{srcs, err}
	}()

	start := time.Now()
	g3root, buildFilePath, workspaceRelativePath, err := getBUILDPath(ctx, path)
	if err != nil {
		return false, nil, err
	}

	bld, err := readBUILD(ctx, buildFilePath, workspaceRelativePath)
	if err != nil {
		platform.Infof("Error reading building file!")
		return false, nil, err
	}
	latencyReport.GetBUILD = time.Since(start)

	start = time.Now()
	ts_auto_depsDisabled, err := isTazeDisabledInPackage(ctx, g3root, buildFilePath, workspaceRelativePath, bld)
	if err != nil {
		return false, nil, err
	}
	latencyReport.TazeDisabled = time.Since(start)
	if ts_auto_depsDisabled {
		return false, nil, nil
	}

	start = time.Now()
	hasSubdirSrcs, err := directoryOrAncestorHasSubdirectorySources(ctx, g3root, workspaceRelativePath, bld)
	latencyReport.SubdirSrcs = time.Since(start)
	if err != nil {
		return false, nil, err
	}
	if hasSubdirSrcs {
		return false, nil, &SubdirectorySourcesError{}
	}

	if bld == nil {
		// The BUILD file didn't exist, so create a new, empty one.
		bld = &build.File{Path: workspaceRelativePath, Type: build.TypeBuild}
	}

	start = time.Now()
	globRes := <-globChan
	if globRes.err != nil {
		return false, nil, globRes.err
	}
	changed, err := upd.addSourcesToBUILD(ctx, path, buildFilePath, bld, globRes.srcs)
	latencyReport.AddSrcs = time.Since(start)
	if err != nil {
		return false, nil, err
	}
	if options.InNonWritableEnvironment && changed {
		return true, nil, &CantProgressAfterWriteError{}
	}

	rules := allTSRules(bld)
	if len(rules) == 0 && !options.IsRoot {
		// No TypeScript rules, no need to query for dependencies etc, so just exit early.
		return changed, latencyReport, nil
	}
	rulesWithSrcs := []*build.Rule{}
	for _, r := range rules {
		srcs := r.Attr("srcs")
		if srcs != nil {
			if l, ok := srcs.(*build.ListExpr); ok && len(l.List) > 0 {
				rulesWithSrcs = append(rulesWithSrcs, r)
			}
		}
	}
	platform.Infof("analyzing...")
	reports, err := upd.runBazelAnalyze(buildFilePath, bld, rulesWithSrcs)
	if err != nil {
		return false, nil, err
	}

	changedAfterBazelAnalyze, err := upd.updateBUILDAfterBazelAnalyze(ctx, options.IsRoot, g3root, buildFilePath, bld, reports)
	if err != nil {
		return false, nil, err
	}
	changed = changed || changedAfterBazelAnalyze
	if options.InNonWritableEnvironment && changed {
		return true, nil, &CantProgressAfterWriteError{}
	}

	return changed, nil, nil
}

// buildHasDisableTaze checks if the BUILD file should be managed using ts_auto_deps.
// Users can disable ts_auto_deps by adding a "disable_ts_auto_deps()" (or "dont_ts_auto_deps_me()") statement.
func buildHasDisableTaze(bld *build.File) bool {
	for _, stmt := range bld.Stmt {
		if call, ok := stmt.(*build.CallExpr); ok {
			if fnName, ok := call.X.(*build.Ident); ok && (fnName.Name == "disable_ts_auto_deps" || fnName.Name == "dont_ts_auto_deps_me") {
				return true
			}
		}
	}
	return false
}

// QueryBasedBazelAnalyze uses bazel query to analyze targets. It is available under a flag or
// an environment variable on engineer's workstations.
func QueryBasedBazelAnalyze(buildFilePath string, targets []string) ([]byte, []byte, error) {
	root, err := workspace.Root(buildFilePath)
	if err != nil {
		return nil, nil, err
	}
	reports, err := analyze.New(analyze.NewQueryBasedTargetLoader(root, "bazel")).Analyze(context.Background(), buildFilePath, targets)
	if err != nil {
		return nil, nil, err
	}
	s, err := proto.Marshal(&arpb.AnalyzeResult{
		DependencyReport: reports,
	})
	return s, nil, err
}

type ruleType int

const (
	ruleTypeAny ruleType = iota
	ruleTypeRegular
	ruleTypeTest
	ruleTypeTestSupport
)

// isKind returns true if the rule has given kind.  It also accepts "ng_modules"
// as "ts_library" kind.
func isKind(r *build.Rule, kind string) bool {
	acceptNgModule := kind == "ts_library"

	return r.Kind() == kind || (acceptNgModule && r.Kind() == "ng_module")
}

func buildRules(bld *build.File, kind string) []*build.Rule {
	// Find all rules, then filter by kind.
	// This is nearly the same as just calling bld.Rules(kind), but allows to
	// retrieve ng_module and ts_library intermixed, in the order in which they
	// appear in the BUILD file. That allows ts_auto_deps to consistently always pick the
	// last build rule in the file in case multiple match, regardless of kind.
	allRules := bld.Rules("")
	var res []*build.Rule
	for _, r := range allRules {
		if isKind(r, kind) {
			res = append(res, r)
		}
	}
	return res
}

// hasDependency returns whether a build rule contains the specified dependency.
func hasDependency(bld *build.File, r *build.Rule, dep string) bool {
	pkg := filepath.Dir(bld.Path)
	oldDeps := r.Attr("deps")
	if edit.ListFind(oldDeps, dep, pkg) != nil {
		return true
	}
	runtimeDeps := r.Attr("runtime_deps")
	return edit.ListFind(runtimeDeps, dep, pkg) != nil
}

// addDep adds a dependency to the specified build rule
func addDep(bld *build.File, r *build.Rule, dep string) {
	pkg := filepath.Dir(bld.Path)
	dep = edit.ShortenLabel(dep, pkg)
	if dep[0] != '/' && dep[0] != ':' {
		dep = ":" + dep // ShortenLabel doesn't add the ':'
	}
	edit.AddValueToListAttribute(r, "deps", pkg, &build.StringExpr{Value: dep}, nil)
}

// AbsoluteBazelTarget converts a ruleName to an absolute target string (//foo/bar:bar).
// It interprets ruleName relative to the given build file's package. It
// supports plain names, names starting with colons, absolute paths, and
// absolute paths with shorthand target syntax (i.e. "bar", ":bar", "//foo/bar",
// "//foo/bar:bar").
func AbsoluteBazelTarget(bld *build.File, ruleName string) string {
	if strings.HasPrefix(ruleName, "//") {
		// already absolute
		if colonIdx := strings.LastIndex(ruleName, ":"); colonIdx == -1 {
			// expand shorthand syntax
			return ruleName + ":" + ruleName[strings.LastIndex(ruleName, "/")+1:]
		}
		return ruleName
	}
	pkg := platform.Normalize(filepath.Dir(bld.Path))
	return fmt.Sprintf("//%s:%s", pkg, strings.TrimPrefix(ruleName, ":"))
}

// Finds all ts_library and ts_declaration targets in the given BUILD file.
func allTSRules(bld *build.File) []*build.Rule {
	var res []*build.Rule
	res = append(res, buildRules(bld, "ts_library")...)
	res = append(res, buildRules(bld, "ts_declaration")...)
	return res
}

// removeSourcesUsed removes sources used by rules of kind ruleKind in attribute
// attrName from the given set of sources.
func removeSourcesUsed(bld *build.File, ruleKind, attrName string, srcs srcSet) {
	for _, rule := range buildRules(bld, ruleKind) {
		for s := range srcs {
			pkg := filepath.Dir(bld.Path)
			// Handles ":foo.ts" references, and concatenated lists [foo.ts] + [bar.ts]
			// TODO(martinprobst): What to do about sources that don't seem to exist?
			if edit.ListFind(rule.Attr(attrName), s, pkg) != nil {
				delete(srcs, s)
			}
		}
	}
}

const (
	tsSkylarkLabel = "@npm_bazel_typescript//:index.bzl"
	ngSkylarkLabel = "@angular//:index.bzl"
)

func removeUnusedLoad(bld *build.File, kind string) {
	if len(bld.Rules(kind)) > 0 {
		return // kind is still used somewhere.
	}
	var stmt []build.Expr
	for _, s := range bld.Stmt {
		load, ok := s.(*build.LoadStmt)
		if !ok {
			stmt = append(stmt, s)
			continue
		}
		if len(load.To) == 0 {
			// a load statement without actually loaded symbols, skip
			continue
		}

		var from, to []*build.Ident
		for i, ca := range load.To {
			if ca.Name != kind {
				from = append(from, load.From[i])
				to = append(to, ca)
			}
		}
		load.From = from
		load.To = to
		if len(to) > 0 {
			stmt = append(stmt, load)
			continue
		}
	}
	bld.Stmt = stmt
}

// setLibraryRuleKinds sets the kinds for recognized library rules. That is, it
// determines if a rule should be an ng_module, and sets the
// rule kind if so. It also takes care of having the appropriate load calls.
func setLibraryRuleKinds(ctx context.Context, buildFilePath string, bld *build.File) error {
	hasNgModule := false
	changed := false
	for _, r := range buildRules(bld, "ts_library") {
		shouldBeNgModule := false
		isNgModule := r.Call.X.(*build.Ident).Name == "ng_module"
		if hasAngularDependency(r) {
			shouldBeNgModule = true
			hasNgModule = true
		}
		if isNgModule && !shouldBeNgModule {
			platform.Infof("Changing rule %s to ts_library()", r.AttrString("name"))
			r.Call.X.(*build.Ident).Name = "ts_library"
			r.DelAttr("assets")
			changed = true
		} else if !isNgModule && shouldBeNgModule {
			platform.Infof("Changing rule %s to ng_module()", r.AttrString("name"))
			r.Call.X.(*build.Ident).Name = "ng_module"
			changed = true
		}
	}
	if changed {
		bld.Stmt = edit.InsertLoad(bld.Stmt, ngSkylarkLabel,
			[]string{"ng_module"}, []string{"ng_module"})
		bld.Stmt = edit.InsertLoad(bld.Stmt, tsSkylarkLabel,
			[]string{"ts_library"}, []string{"ts_library"})
		removeUnusedLoad(bld, "ts_library")
		removeUnusedLoad(bld, "ng_module")
	}
	if !hasNgModule {
		return nil
	}
	return updateWebAssets(ctx, buildFilePath, bld)
}

// hasAngularDependency returns true if the given rule depends on a Angular
// build rule.
func hasAngularDependency(r *build.Rule) bool {
	e := r.Attr("deps")
	for _, li := range edit.AllLists(e) {
		for _, elem := range li.List {
			str, ok := elem.(*build.StringExpr)
			if ok && strings.HasPrefix(str.Value, "//third_party/javascript/angular2") {
				return true
			}
		}
	}
	return false
}

// updateWebAssets finds web assets in the package of the BUILD file and adds
// them to the "assets" attribute of the ng_module rules.
func updateWebAssets(ctx context.Context, buildFilePath string, bld *build.File) error {
	// TODO(martinprobst): should this be merged with updateSources above? Difference is that
	// creates new rules, this just distributes assets across them.
	// This must use buildFilePath, the absolute path to the directory, as our cwd
	// might not be the workspace root.
	absolutePkgPath := filepath.Dir(buildFilePath)
	assetFiles, err := globSources(ctx, absolutePkgPath, []string{"html", "css"})
	if err != nil {
		return err
	}
	platform.Infof("Found asset files in %s: %v", absolutePkgPath, assetFiles)

	pkg := filepath.Dir(bld.Path)
	for _, r := range bld.Rules("ng_module") {
		srcs := r.Attr("assets")
		if call, ok := srcs.(*build.CallExpr); ok && call.X.(*build.Ident).Name == "glob" {
			// Remove any glob calls, ts_auto_deps uses explicit source lists.
			r.DelAttr("assets")
		}

		for _, s := range r.AttrStrings("assets") {
			if strings.HasPrefix(s, ":") || strings.HasPrefix(s, "//") {
				continue // keep rule references
			}
			if _, ok := assetFiles[s]; !ok {
				edit.ListAttributeDelete(r, "assets", s, pkg)
			}
		}
	}

	removeSourcesUsed(bld, "ng_module", "assets", assetFiles)
	if len(assetFiles) == 0 {
		return nil
	}

	// Add to the last rule, to match behaviour with *.ts sources.
	lastModule := getLastRule(bld, "ng_module", ruleTypeRegular)
	if lastModule == nil {
		// Fall back to using any ng_module
		lastModule = getLastRule(bld, "ng_module", ruleTypeAny)
	}
	if lastModule == nil {
		// Should not happen by preconditions of this function.
		return fmt.Errorf("no ng_module rules in BUILD?")
	}

	for newAsset := range assetFiles {
		val := &build.StringExpr{Value: newAsset}
		edit.AddValueToListAttribute(lastModule, "assets", pkg, val, nil)
	}
	return nil
}

// getOrCreateRule returns or creates a rule of the given kind, with testonly = 1 or 0 depending on
// rt. If there's no such rule, it creates a new rule with the given ruleName.
// If there is more than one rule matching, it returns the *last* rule.
func getOrCreateRule(bld *build.File, ruleName, ruleKind string, rt ruleType) *build.Rule {
	if r := getLastRule(bld, ruleKind, rt); r != nil {
		return r
	}

	// TODO(calebegg): Switch this to "_test" but still support "_tests"
	if rt == ruleTypeTest {
		ruleName += "_tests"
	}

	loadArgs := []string{ruleKind}
	bld.Stmt = edit.InsertLoad(bld.Stmt, tsSkylarkLabel, loadArgs, loadArgs)

	r := &build.Rule{&build.CallExpr{X: &build.Ident{Name: ruleKind}}, ""}
	// Rename to *_ts if there's a name collision. This leaves open a collision with another rule
	// called _ts, but that failure mode is unlikely to happen accidentally.
	if edit.FindRuleByName(bld, ruleName) != nil {
		ruleName = ruleName + "_ts"
	} else if filepath.Base(filepath.Dir(bld.Path)) == ruleName {
		// The various *_ajd macros do not have a "name" attribute, but implicitly use the package name.
		// Make sure not to use the package name if there is a *_ajd rule.
		for _, r := range bld.Rules("") {
			if r.Name() == "" && strings.HasSuffix(r.Kind(), "_ajd") {
				ruleName = ruleName + "_ts"
				break
			}
		}
	}
	r.SetAttr("name", &build.StringExpr{Value: ruleName})
	if rt == ruleTypeTest || rt == ruleTypeTestSupport {
		r.SetAttr("testonly", &build.Ident{Name: "True"})
	}
	bld.Stmt = append(bld.Stmt, r.Call)
	return r
}

// ruleMatches return whether a rule matches the specified kind and rt value.
func ruleMatches(bld *build.File, r *build.Rule, kind string, rt ruleType) bool {
	if !isKind(r, kind) {
		return false
	}
	inTestingDir := determineRuleType(bld.Path, "somefile.ts") == ruleTypeTestSupport
	hasTestsName := strings.HasSuffix(r.Name(), "_tests")
	// Accept the rule if it matches the testonly attribute.
	if rt == ruleTypeAny {
		return true
	}
	if attrTruthy(r, "testonly") {
		if inTestingDir && ((hasTestsName && rt == ruleTypeTest) || (!hasTestsName && rt == ruleTypeTestSupport)) {
			return true
		}
		if !inTestingDir && rt == ruleTypeTest {
			return true
		}
	}
	return rt == ruleTypeRegular && !attrTruthy(r, "testonly")
}

// targetRegisteredInRule returns whether a target has been registered in a rule that
// matches a specified ruleKind and ruleType in current build file
func targetRegisteredInRule(bld *build.File, ruleKind string, rt ruleType, target string) bool {
	for _, r := range bld.Rules("") {
		if ruleMatches(bld, r, ruleKind, rt) && hasDependency(bld, r, target) {
			return true
		}
	}
	return false
}

// getRule returns the last rule in bld that has the given ruleKind and matches
// the specified rt value.
func getLastRule(bld *build.File, ruleKind string, rt ruleType) *build.Rule {
	rules := getRules(bld, ruleKind, rt)

	if len(rules) == 0 {
		return nil
	}

	return rules[len(rules)-1]
}

// getRules returns all the rules in bld that have the given ruleKind and
// matches the specified rt value.
func getRules(bld *build.File, ruleKind string, rt ruleType) []*build.Rule {
	var rules []*build.Rule
	for _, r := range bld.Rules("") {
		if ruleMatches(bld, r, ruleKind, rt) {
			rules = append(rules, r)
		}
	}

	return rules
}

// FilterPaths filters the given paths, returning the deduplicated set of
// folders that contain TypeScript sources (.ts and .tsx) or BUILD files.
func FilterPaths(paths []string) []string {
	fileSet := make(map[string]bool)
	for _, p := range paths {
		if !strings.HasSuffix(p, ".ts") && !strings.HasSuffix(p, ".tsx") && filepath.Base(p) != "BUILD" {
			continue
		}
		fileSet[filepath.Dir(p)] = true
	}
	var newPaths []string
	for k := range fileSet {
		newPaths = append(newPaths, platform.Normalize(k))
	}
	return newPaths
}

// ResolvePackages resolves package paths, i.e. paths starting with '//',
// against the workspace root folder closest to the current working directory.
// It updates paths in place.
// It returns an error if it cannot find a workspace root or working directory.
func ResolvePackages(paths []string) error {
	for i, p := range paths {
		if strings.HasPrefix(p, "//") {
			wd, err := os.Getwd()
			if err != nil {
				return fmt.Errorf("failed to get working directory: %v", err)
			}
			g3root, err := workspace.Root(wd)
			if err != nil {
				return fmt.Errorf("failed to find workspace root under %q: %v", wd, err)
			}
			paths[i] = filepath.Join(g3root, p)
		}
	}
	return nil
}

type noAncestorBUILDError struct{}

func (nabe *noAncestorBUILDError) Error() string {
	return "no ancestor BUILD file found"
}

// FindBUILDFile searches for the closest parent BUILD file above pkg. It
// returns the parsed BUILD file, or an error if none can be found.
func FindBUILDFile(ctx context.Context, pkgToBUILD map[string]*build.File,
	workspaceRoot string, packagePath string) (*build.File, error) {
	if packagePath == "." || packagePath == "/" {
		return nil, &noAncestorBUILDError{}
	}
	if bld, ok := pkgToBUILD[packagePath]; ok {
		return bld, nil
	}
	buildPath := filepath.Join(workspaceRoot, packagePath, "BUILD")
	bld, err := readBUILD(ctx, buildPath, filepath.Join(packagePath, "BUILD"))
	if err != nil {
		return nil, err
	} else if bld == nil {
		// Recursively search parent package and cache its location below if found.
		bld, err = FindBUILDFile(ctx, pkgToBUILD, workspaceRoot, filepath.Dir(packagePath))
	}
	if err == nil {
		// NB: The cache key is packagePath ('foo/bar/baz'), even if build file was
		// found at a higher location ('foo/BUILD'). This avoids re-testing for file
		// existence.
		pkgToBUILD[packagePath] = bld
	}
	return bld, err
}

// Paths gets the list of paths for the current execution of ts_auto_deps.
func Paths(isRoot bool, files bool, recursive bool) ([]string, error) {
	paths := flag.Args()
	if len(paths) == 0 {
		wd, err := os.Getwd()
		if err != nil {
			return nil, fmt.Errorf("failed to get working directory: %v", err)
		}
		paths = []string{wd}
	}

	if len(paths) > 1 && isRoot {
		return nil, fmt.Errorf("can only take exactly one path with -root")
	}

	if files {
		paths = FilterPaths(paths)
		if len(paths) == 0 {
			return nil, fmt.Errorf("WARNING: found no TypeScript files in %s", paths)
		}
	}

	if err := ResolvePackages(paths); err != nil {
		return nil, fmt.Errorf("failed to resolve packages: %s", err)
	}

	if recursive {
		var lock sync.Mutex // guards allPaths
		var allPaths []string
		for _, p := range paths {
			err := platform.Walk(p, func(path string, info os.FileMode) error {
				if info.IsDir() {
					lock.Lock()
					allPaths = append(allPaths, path)
					lock.Unlock()
				}
				return nil
			})
			if err != nil {
				return nil, fmt.Errorf("ts_auto_deps -recursive failed: %s", err)
			}
		}
		sort.Sort(byLengthInverted(allPaths))
		paths = allPaths
	}

	return paths, nil
}

// Execute runs ts_auto_deps on paths using host.
func Execute(host *Updater, paths []string, isRoot, recursive bool) error {
	ctx := context.Background()
	for i, p := range paths {
		isLastAndRoot := isRoot && i == len(paths)-1
		changed, _, err := host.UpdateBUILD(ctx, p, UpdateBUILDOptions{InNonWritableEnvironment: false, IsRoot: isLastAndRoot})
		if err != nil {
			if recursive {
				return fmt.Errorf("ts_auto_deps failed on %s/BUILD: %s", p, err)
			}
			return fmt.Errorf("ts_auto_deps failed: %s", err)
		}
		if changed {
			if filepath.Base(p) == "BUILD" {
				fmt.Printf("Wrote %s\n", p)
			} else {
				fmt.Printf("Wrote %s\n", filepath.Join(p, "BUILD"))
			}
		}
	}
	host.RegisterTestRules(ctx, paths...)
	return nil
}

// allPaths walks the file system and returns a list of all directories under
// all paths.
func allPaths(paths []string) ([]string, error) {
	var allPaths []string
	for _, p := range paths {
		err := filepath.Walk(p, func(path string, info os.FileInfo, err error) error {
			if err == nil && info.IsDir() {
				allPaths = append(allPaths, path)
			}
			return err
		})
		if err != nil {
			return nil, err
		}
	}
	sort.Sort(byLengthInverted(allPaths))
	return allPaths, nil
}

type byLengthInverted []string

func (s byLengthInverted) Len() int           { return len(s) }
func (s byLengthInverted) Swap(i, j int)      { s[i], s[j] = s[j], s[i] }
func (s byLengthInverted) Less(i, j int) bool { return len(s[i]) > len(s[j]) }
