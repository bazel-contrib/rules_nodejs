// Package updater implements the main logic of the ts_auto_deps command. It reads BUILD files,
// discovers TypeScript sources, uses `bazel analyze` to update import/dependency information,
// and then modifies the BUILD file accordingly.
package updater

import (
	"context"
	"fmt"
	"os"
	"path/filepath"
	"regexp"
	"sort"
	"strconv"
	"strings"
	"syscall"
	"time"

	"flag"
	"github.com/bazelbuild/buildtools/build"
	"github.com/bazelbuild/buildtools/edit"
	"github.com/bazelbuild/rules_typescript/ts_auto_deps/analyze"
	"github.com/bazelbuild/rules_typescript/ts_auto_deps/platform"
	"github.com/bazelbuild/rules_typescript/ts_auto_deps/workspace"
	"github.com/golang/protobuf/proto"

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

func bazelBinary() string {

	return "bazel"
}

func attrTruthy(r *build.Rule, attr string) bool {
	attrVal := r.AttrLiteral(attr)
	return attrVal == "True" || attrVal == "1"
}

// Matches the warning TypeScriptRuleChecker prints for unused ts_declarations.
// TODO(martinprobst): in the long term, this should become the default and TypeScriptRuleChecker should no longer special case ts_declaration.
var unusedDeclarationRE = regexp.MustCompile(
	`WARNING: [^:]+:\d+:\d+: keeping possibly used ts_declaration '([^']+)'`)

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
	args := []string{}
	args = append(args, "--analysis_output=PROTO")
	var targets []string
	for _, r := range rules {
		fullTarget := AbsoluteBazelTarget(bld, r.Name())
		targets = append(targets, fullTarget)
	}
	args = append(args, targets...)
	out, stderr, err := upd.bazelAnalyze(buildFilePath, args)
	if err != nil {
		return nil, &AnalysisFailedError{
			[]AnalysisFailureCause{
				AnalysisFailureCause{
					Message: fmt.Sprintf("running bazel analyze %s failed: %v", args, err),
					Path:    buildFilePath,
				},
			},
		}
	}

	var res arpb.AnalyzeResult
	if err := proto.Unmarshal(out, &res); err != nil {
		// TODO(lucassloan): remove when b/112891536 is fixed
		// Build Rabbit rewrites paths produced by bazel, which garbles the error
		// messages from bazel analyze, since they're encoded in protobufs.
		return nil, &GarbledBazelResponseError{fmt.Sprintf("failed to unmarshal analysis result: %v\nin: %s", err, string(out))}
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
	if !isatty(int(os.Stderr.Fd())) {
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

// isatty reports whether fd is a tty.
func isatty(fd int) bool {
	var st syscall.Stat_t
	err := syscall.Fstat(fd, &st)
	if err != nil {
		return false
	}
	return st.Mode&syscall.S_IFMT == syscall.S_IFCHR
}

// readBUILD loads the BUILD file, if present, or returns a new empty one.
// workspaceRoot must be an absolute path and buildFilePath is interpreted as
// relative to CWD, and must be underneath workspaceRoot.
func readBUILD(ctx context.Context, workspaceRoot, buildFilePath string) (*build.File, error) {
	// Relativize the absolute build path so that buildFilePath is definitely below workspaceRoot.
	absPath, err := filepath.Abs(buildFilePath)
	if err != nil {
		return nil, err
	}
	g3Path, err := filepath.Rel(workspaceRoot, absPath)
	if err != nil {
		return nil, fmt.Errorf("failed to resolve workspace relative path: %s", err)
	}
	data, err := platform.ReadFile(ctx, buildFilePath)
	if err != nil {
		if os.IsNotExist(err) {
			return &build.File{Path: g3Path, Build: true}, nil
		}
		return nil, fmt.Errorf("reading %q: %s", buildFilePath, err)
	}
	return build.ParseBuild(g3Path, data)
}

type srcSet map[string]bool

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
		p, err := filepath.Rel(path, p)
		if err != nil {
			return nil, fmt.Errorf("filepath.Rel(%s, %s): %v", path, p, err)
		}
		srcs[p] = true
	}
	return srcs, nil
}

func isTempFile(fileName string) bool {
	return strings.HasPrefix(fileName, ".") || strings.HasSuffix(fileName, ".swp") ||
		strings.HasSuffix(fileName, "~")
}

// updateSources adds any srcs that are not in some rule to the last ts_* rule
// in the package, or create a new rule for them.
func updateSources(bld *build.File, srcs srcSet) bool {
	removeSourcesUsed(bld, "ts_library", "srcs", srcs)
	removeSourcesUsed(bld, "ts_declaration", "srcs", srcs)

	if len(srcs) == 0 {
		return false
	}

	// Sort the remaining sources for reproducibility (sadly Go has no LinkedHashSet)
	var srcSlice []string
	for s := range srcs {
		srcSlice = append(srcSlice, s)
	}
	sort.Strings(srcSlice)

	pkgName := filepath.Base(filepath.Dir(bld.Path))
	for _, s := range srcSlice {
		var r *build.Rule
		ruleName := pkgName
		if strings.HasSuffix(s, ".d.ts") {
			r = getOrCreateRule(bld, ruleName+"_dts", "ts_declaration", ruleTypeRegular)
		} else {
			rt := determineRuleType(bld.Path, s)
			r = getOrCreateRule(bld, ruleName, "ts_library", rt)
		}
		srcs := r.Attr("srcs")
		switch srcs.(type) {
		case nil, *build.ListExpr:
			// expected - either absent or a list of files.
		default:
			// Remove any glob calls, variables, etc. ts_auto_deps uses explicit source lists.
			fmt.Fprintf(os.Stderr, "WARNING: clobbering non-list srcs attribute on %s\n",
				AbsoluteBazelTarget(bld, r.Name()))
			r.DelAttr("srcs")
		}
		val := &build.StringExpr{Value: s}
		edit.AddValueToListAttribute(r, "srcs", pkgName, val, nil)
	}
	return true
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
	// workspace path of the file on which analysis failed
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
// Returns true if it changed anything in the build file.
func updateDeps(bld *build.File, reports []*arpb.DependencyReport) (bool, error) {
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
					return false, err
				}

				errors = append(errors, AnalysisFailureCause{msg, file, line})
			}
		}
	}
	if len(errors) > 0 {
		return false, &AnalysisFailedError{errors}
	}

	pkg := filepath.Dir(bld.Path)
	changedDeps := false
	for _, report := range reports {
		platform.Infof("Applying report: %s", report.String())
		fullTarget := report.GetRule()
		targetName := fullTarget[strings.LastIndex(fullTarget, ":")+1:]
		r := edit.FindRuleByName(bld, targetName)
		if r == nil {
			return false, fmt.Errorf("could not find rule from report %v", targetName)
		}
		for _, md := range report.MissingDependencyGroup {
			for _, d := range md.Dependency {
				d = AbsoluteBazelTarget(bld, d)
				if d == fullTarget {
					return false, &AnalysisFailedError{
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
				if addDep(bld, r, d) {
					changedDeps = true
				}
			}
		}
		hadUnresolved := len(report.UnresolvedImport) > 0
		if hadUnresolved {
			errMsg := fmt.Sprintf("ERROR in %s: unresolved imports %s.\nMaybe you are missing a "+
				"'// from ...'' comment, or the target BUILD files are incorrect?\n%s\n",
				fullTarget, report.UnresolvedImport, strings.Join(report.GetFeedback(), "\n"))
			fmt.Fprintf(os.Stderr, errMsg)
			fmt.Fprintf(os.Stderr, "Continuing.\n")
		}
		for _, d := range report.UnnecessaryDependency {
			if hadUnresolved {
				fmt.Fprintf(os.Stderr, "Keeping unnecessary dependency %s due to unresolved imports\n", d)
				continue
			}
			platform.Infof("Removing dependency on %s from %s\n", d, fullTarget)
			if edit.ListAttributeDelete(r, "deps", d, pkg) != nil {
				// Dep might not exist if e.g. using a macro such as ng_module
				changedDeps = true
			}
		}
		for _, s := range report.MissingSourceFile {
			platform.Infof("Removing missing source %s from %s\n", s, fullTarget)
			if edit.ListAttributeDelete(r, "srcs", s, pkg) != nil {
				changedDeps = true
			}
		}
	}
	return changedDeps, nil
}

func (upd *Updater) writeBUILD(ctx context.Context, path string, bld *build.File) error {
	ri := &build.RewriteInfo{}
	build.Rewrite(bld, ri)
	platform.Infof("Formatted %s: %s\n", path, ri)
	data := string(build.Format(bld))
	if err := upd.updateFile(ctx, path, data); err != nil {
		return fmt.Errorf("failed to update %q: %v", path, err)
	}
	return nil
}

func getBUILDPathAndBUILDFile(ctx context.Context, path string) (string, string, *build.File, error) {
	path = strings.TrimSuffix(path, "/BUILD") // Support both package paths and BUILD files
	if _, err := platform.Stat(ctx, path); os.IsNotExist(err) {
		return "", "", nil, err
	}
	buildFilePath := filepath.Join(path, "BUILD")
	g3root, err := workspace.Root(buildFilePath)
	if err != nil {
		return "", "", nil, err
	}
	bld, err := readBUILD(ctx, g3root, buildFilePath)
	if err != nil {
		platform.Infof("Error reading building file!")
		return "", "", nil, err
	}

	return g3root, buildFilePath, bld, nil
}

// isTazeDisabled checks the BUILD file, or if the directory doesn't exist, the nearest
// ancestor BUILD file for a disable_ts_auto_deps() rule.
func isTazeDisabled(ctx context.Context, g3root string, buildFilePath string, bld *build.File) bool {
	if _, err := platform.Stat(ctx, buildFilePath); err != nil && os.IsNotExist(err) {
		// Make sure ts_auto_deps hasn't been disabled in the next closest ancestor package.
		ancestor, err := FindBUILDFile(ctx, make(map[string]*build.File), g3root, filepath.Dir(bld.Path))
		if err != nil {
			platform.Infof("Could not find any ancestor BUILD for %q, continuing with a new BUILD file",
				buildFilePath)
		} else if !hasTazeEnabled(ancestor) {
			fmt.Printf("ts_auto_deps disabled below %q\n", ancestor.Path)
			return true
		} else {
			platform.Infof("BUILD file missing and ts_auto_deps is enabled below %q. Creating new BUILD file.",
				ancestor.Path)
		}
	}

	if !hasTazeEnabled(bld) {
		fmt.Printf("ts_auto_deps disabled on %q\n", buildFilePath)
		return true
	}

	return false
}

func (upd *Updater) addSourcesToBUILD(ctx context.Context, path string, buildFilePath string, bld *build.File) (bool, error) {
	platform.Infof("Globbing TS sources in %s", path)
	srcs, err := globSources(ctx, path, []string{"ts", "tsx"})
	if err != nil {
		return false, err
	}

	platform.Infof("Updating sources")
	updatedBuild := updateSources(bld, srcs)

	if updatedBuild {
		if err := upd.writeBUILD(ctx, buildFilePath, bld); err != nil {
			platform.Infof("Error Writing BUILD!")
			return true, err
		}
	}

	return updatedBuild, nil
}

// updateBUILDAfterBazelAnalyze applies the BUILD file updates that depend on bazel
// analyze's DependencyReports, most notably updating any rules' deps.
func (upd *Updater) updateBUILDAfterBazelAnalyze(ctx context.Context, isRoot bool,
	g3root string, buildFilePath string, bld *build.File, reports []*arpb.DependencyReport) (bool, error) {
	platform.Infof("Updating deps")
	updatedBuild, err := updateDeps(bld, reports)
	if err != nil {
		return false, err
	}

	platform.Infof("Setting library rule kinds")
	updatedRuleKinds, err := setLibraryRuleKinds(ctx, buildFilePath, bld)
	if err != nil {
		return false, err
	}
	updatedBuild = updatedBuild || updatedRuleKinds

	if updatedBuild {
		if err := upd.writeBUILD(ctx, buildFilePath, bld); err != nil {
			return true, err
		}
	}

	if tr := getRule(bld, "ts_library", ruleTypeTest); tr != nil {
		platform.Infof("Registering test rule in closest ts_config & ts_development_sources")
		target := AbsoluteBazelTarget(bld, tr.Name())
		if err := upd.registerTestRule(ctx, bld, "ts_config", ruleTypeAny, g3root, target); err != nil {
			return false, err
		}
		// NodeJS rules should not be added to ts_development_sources automatically, because
		// they typically do not run in the browser.
		if tr.AttrString("runtime") != "nodejs" {
			if err := upd.registerTestRule(ctx, bld, "ts_development_sources", ruleTypeTest, g3root, target); err != nil {
				return false, err
			}
		}
	}

	return updatedBuild, nil
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

// UpdateBUILD drives the main process of creating/updating the BUILD file
// underneath path based on the available sources. Returns true if it modified
// the BUILD file, false if the BUILD file was up to date already.
// bazelAnalyze is used to run the underlying `bazel analyze` process.
func (upd *Updater) UpdateBUILD(ctx context.Context, path string, options UpdateBUILDOptions) (bool, error) {
	g3root, buildFilePath, bld, err := getBUILDPathAndBUILDFile(ctx, path)
	if err != nil {
		return false, err
	}

	if isTazeDisabled(ctx, g3root, buildFilePath, bld) {
		return false, nil
	}

	changed, err := upd.addSourcesToBUILD(ctx, path, buildFilePath, bld)
	if err != nil {
		return false, err
	}
	if options.InNonWritableEnvironment && changed {
		return true, &CantProgressAfterWriteError{}
	}

	rules := allTSRules(bld)
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
		return false, err
	}

	changedAfterBazelAnalyze, err := upd.updateBUILDAfterBazelAnalyze(ctx, options.IsRoot, g3root, buildFilePath, bld, reports)
	return changed || changedAfterBazelAnalyze, err
}

// hasTazeEnabled checks if the BUILD file should be managed using ts_auto_deps.
// Users can disable ts_auto_deps by adding a "disable_ts_auto_deps()" (or "dont_ts_auto_deps_me()") statement.
func hasTazeEnabled(bld *build.File) bool {
	for _, stmt := range bld.Stmt {
		if call, ok := stmt.(*build.CallExpr); ok {
			if fnName, ok := call.X.(*build.Ident); ok && (fnName.Name == "disable_ts_auto_deps" || fnName.Name == "dont_ts_auto_deps_me") {
				return false
			}
		}
	}
	return true
}

// QueryBasedBazelAnalyze uses bazel query to analyze targets. It is available under a flag or
// an environment variable on engineer's workstations.
func QueryBasedBazelAnalyze(buildFilePath string, args []string) ([]byte, []byte, error) {
	// The first member of args is the '--analysis_output=PROTO' flag. Remove
	// this flag to get only the targets.
	targets := args[1:]
	root, err := workspace.Root(buildFilePath)
	if err != nil {
		return nil, nil, err
	}
	reports, err := analyze.New(analyze.NewQueryBasedTargetLoader(root, bazelBinary())).Analyze(context.Background(), buildFilePath, targets)
	if err != nil {
		return nil, nil, err
	}
	s, err := proto.Marshal(&arpb.AnalyzeResult{
		DependencyReport: reports,
	})
	return s, nil, err
}

// registerTestRule searches ancestor packages for a rule with the given ruleKind and ruleType
// and adds the given target to it. Prints a warning if no rule is found, but only returns an error
// if adding the dependency fails.
func (upd *Updater) registerTestRule(ctx context.Context, bld *build.File, ruleKind string, rt ruleType, g3root, target string) error {
	// If the target has already been registered in any of the rule with the given ruleKind and ruleType,
	// we shouldn't register it again.
	if targetRegisteredInRule(bld, ruleKind, rt, target) {
		return nil
	}
	r := getRule(bld, ruleKind, rt)
	if r != nil {
		if addDep(bld, r, target) {
			fmt.Printf("Registered test %s in %s\n", target, AbsoluteBazelTarget(bld, r.Name()))
			return upd.writeBUILD(ctx, filepath.Join(g3root, bld.Path), bld)
		}
		return nil
	}
	parentDir := filepath.Dir(filepath.Dir(bld.Path))
	for parentDir != "." && parentDir != "/" {
		buildFile := filepath.Join(g3root, parentDir, "BUILD")
		if _, err := platform.Stat(ctx, buildFile); err == nil {
			parent, err := readBUILD(ctx, g3root, buildFile)
			if err != nil {
				return err
			}
			if hasTazeEnabled(bld) {
				return upd.registerTestRule(ctx, parent, ruleKind, rt, g3root, target)
			}
			platform.Infof("ts_auto_deps disabled on %q", buildFile)
			// Continue below.
		}
		parentDir = filepath.Dir(parentDir)
	}
	ruleTypeStr := ""
	switch rt {
	case ruleTypeRegular:
		ruleTypeStr = "testonly=0"
	case ruleTypeTest, ruleTypeTestSupport:
		ruleTypeStr = "testonly=1"
	default:
		break
	}
	fmt.Printf("WARNING: no %s(%s) rule in parent packages of %s to register with.\n",
		ruleKind, ruleTypeStr, target)
	return nil
}

type ruleType int

const (
	ruleTypeAny ruleType = iota
	ruleTypeRegular
	ruleTypeTest
	ruleTypeTestSupport
)

func buildRules(bld *build.File, kind string) []*build.Rule {
	// Find all rules, then filter by kind.
	// This is nearly the same as just calling bld.Rules(kind), but allows to
	// retrieve ng_module and ts_library intermixed, in the order in which they
	// appear in the BUILD file. That allows ts_auto_deps to consistently always pick the
	// last build rule in the file in case multiple match, regardless of kind.
	allRules := bld.Rules("")
	var res []*build.Rule
	acceptNgModule := kind == "ts_library"
	for _, r := range allRules {
		if r.Kind() == kind || (acceptNgModule && r.Kind() == "ng_module") {
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
func addDep(bld *build.File, r *build.Rule, dep string) bool {
	// If the rule has the specified dependency already, we shouldn't add it again
	if hasDependency(bld, r, dep) {
		return false
	}
	pkg := filepath.Dir(bld.Path)
	dep = edit.ShortenLabel(dep, pkg)
	if dep[0] != '/' && dep[0] != ':' {
		dep = ":" + dep // ShortenLabel doesn't add the ':'
	}
	edit.AddValueToListAttribute(r, "deps", pkg, &build.StringExpr{Value: dep}, nil)
	return true
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
	pkg := filepath.Dir(bld.Path)
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
		ruleSrcs := rule.AttrStrings(attrName)
		for _, s := range ruleSrcs {
			// TODO(martinprobst): What to do about sources that don't seem to exist?
			if strings.HasPrefix(s, ":") {
				s = s[1:] // Recognize ":foo.ts" style references to sources
			}
			// Might be generated srcs.
			delete(srcs, s)
		}
	}
}

const (
	tsSkylarkLabel = "@build_bazel_rules_typescript//:defs.bzl"
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
func setLibraryRuleKinds(ctx context.Context, buildFilePath string, bld *build.File) (bool, error) {
	changed := false
	hasNgModule := false
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
	if hasNgModule {
		changedAssets, err := updateWebAssets(ctx, buildFilePath, bld)
		if err != nil {
			return false, err
		}
		changed = changed || changedAssets
	}
	return changed, nil
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
// them to the "assets" attribute of the ng_module rules. Returns true if it
// changed anything in the build file.
func updateWebAssets(ctx context.Context, buildFilePath string, bld *build.File) (bool, error) {
	// TODO(martinprobst): should this be merged with updateSources above? Difference is that
	// creates new rules, this just distributes assets across them.
	changed := false
	// This must use buildFilePath, the absolute path to the directory, as our cwd
	// might not be the workspace root.
	absolutePkgPath := filepath.Dir(buildFilePath)
	assetFiles, err := globSources(ctx, absolutePkgPath, []string{"html", "css"})
	if err != nil {
		return false, err
	}
	platform.Infof("Found asset files in %s: %v", absolutePkgPath, assetFiles)

	pkg := filepath.Dir(bld.Path)
	for _, r := range bld.Rules("ng_module") {
		srcs := r.Attr("assets")
		if call, ok := srcs.(*build.CallExpr); ok && call.X.(*build.Ident).Name == "glob" {
			// Remove any glob calls, ts_auto_deps uses explicit source lists.
			r.DelAttr("assets")
			changed = true
		}

		for _, s := range r.AttrStrings("assets") {
			if strings.HasPrefix(s, ":") || strings.HasPrefix(s, "//") {
				continue // keep rule references
			}
			if _, ok := assetFiles[s]; !ok {
				del := edit.ListAttributeDelete(r, "assets", s, pkg)
				changed = changed || del != nil
			}
		}
	}

	removeSourcesUsed(bld, "ng_module", "assets", assetFiles)
	if len(assetFiles) == 0 {
		return changed, nil // nothing new, but might have deleted something.
	}

	// Add to the last rule, to match behaviour with *.ts sources.
	lastModule := getRule(bld, "ng_module", ruleTypeRegular)
	if lastModule == nil {
		// Fall back to using any ng_module
		lastModule = getRule(bld, "ng_module", ruleTypeAny)
	}
	if lastModule == nil {
		// Should not happen by preconditions of this function.
		return changed, fmt.Errorf("no ng_module rules in BUILD?")
	}

	for newAsset := range assetFiles {
		val := &build.StringExpr{Value: newAsset}
		edit.AddValueToListAttribute(lastModule, "assets", pkg, val, nil)
	}
	return true, nil
}

// getOrCreateRule returns or creates a rule of the given kind, with testonly = 1 or 0 depending on
// rt. If there's no such rule, it creates a new rule with the given ruleName.
// If there is more than one rule matching, it returns the *last* rule.
func getOrCreateRule(bld *build.File, ruleName, ruleKind string, rt ruleType) *build.Rule {
	if r := getRule(bld, ruleKind, rt); r != nil {
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

// ruleMatches return whether a rule matches the specified rt value.
func ruleMatches(bld *build.File, r *build.Rule, rt ruleType) bool {
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
	rs := buildRules(bld, ruleKind)
	for _, r := range rs {
		if ruleMatches(bld, r, rt) && hasDependency(bld, r, target) {
			return true
		}
	}
	return false
}

// getRule returns the last rule in bld that has the given ruleKind and matches
// the specified rt value.
func getRule(bld *build.File, ruleKind string, rt ruleType) *build.Rule {
	rs := buildRules(bld, ruleKind)
	for i := len(rs) - 1; i >= 0; i-- {
		r := rs[i]
		if ruleMatches(bld, r, rt) {
			return r
		}
	}
	return nil
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
		newPaths = append(newPaths, k)
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

// FindBUILDFile searches for the closest parent BUILD file above pkg. It
// returns the parsed BUILD file, or an error if none can be found.
func FindBUILDFile(ctx context.Context, pkgToBUILD map[string]*build.File,
	workspaceRoot string, packagePath string) (*build.File, error) {
	if packagePath == "." || packagePath == "/" {
		return nil, fmt.Errorf("no ancestor BUILD file found")
	}
	if bld, ok := pkgToBUILD[packagePath]; ok {
		return bld, nil
	}
	buildPath := filepath.Join(workspaceRoot, packagePath, "BUILD")
	_, err := platform.Stat(ctx, buildPath)
	var bld *build.File
	if err == nil {
		bld, err = readBUILD(ctx, workspaceRoot, buildPath)
	} else if os.IsNotExist(err) {
		// Recursively search parent package and cache its location below if found.
		bld, err = FindBUILDFile(ctx, pkgToBUILD, workspaceRoot, filepath.Dir(packagePath))
	} else {
		return nil, err
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
		var allPaths []string
		for _, p := range paths {
			err := filepath.Walk(p, func(path string, info os.FileInfo, err error) error {
				if err == nil && info.IsDir() {
					allPaths = append(allPaths, path)
				}
				return err
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
func Execute(host *Updater, paths []string, isRoot bool, recursive bool) error {
	ctx := context.Background()
	for i, p := range paths {
		isLastAndRoot := isRoot && i == len(paths)-1
		changed, err := host.UpdateBUILD(ctx, p, UpdateBUILDOptions{InNonWritableEnvironment: false, IsRoot: isLastAndRoot})
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
