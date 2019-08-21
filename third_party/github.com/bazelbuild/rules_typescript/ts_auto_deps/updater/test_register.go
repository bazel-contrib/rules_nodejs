package updater

import (
	"context"
	"fmt"
	"path/filepath"

	"github.com/bazelbuild/buildtools/build"
	"github.com/bazelbuild/rules_typescript/ts_auto_deps/platform"
)

// isAllTestLibrary identifies testonly ts_libraries named "all_tests".  Taze
// will register tests with these rules instead of
// ts_config/ts_development_sources rules to allow users to set up their builds
// differently.
func isAllTestLibrary(bld *build.File, r *build.Rule) bool {
	if !ruleMatches(bld, r, "ts_library", ruleTypeTest) {
		return false
	}

	if r.Name() != "all_tests" {
		return false
	}

	return true
}

func getAllTestLibraries(bld *build.File) []*build.Rule {
	var allTestRules []*build.Rule
	for _, r := range buildRules(bld, "ts_library") {
		if isAllTestLibrary(bld, r) {
			allTestRules = append(allTestRules, r)
		}
	}
	return allTestRules
}

// RegisterTestRules registers ts_library test targets with the project's
// ts_config and ts_development_sources rules.  It may also register the tests
// with a testonly ts_library named "all_tests", which allows users to set up
// their own BUILD layout.  It's separated from UpdateBUILD since it's
// non-local, multiple packages may all need to make writes to the same
// ts_config.  It returns a set of the paths for the packages that were updated.
func (upd *Updater) RegisterTestRules(ctx context.Context, paths ...string) (bool, map[string]bool, error) {
	reg := &buildRegistry{make(map[string]*build.File), make(map[*build.File]bool)}
	var g3root string
	updatedAncestorPackages := make(map[string]bool)
	for _, path := range paths {
		// declare variables manually so that g3root doesn't get overwritten by a :=
		// declaration
		var err error
		var buildPath string
		g3root, buildPath, err = getBUILDPath(ctx, path)
		if err != nil {
			return false, nil, err
		}
		bld, err := reg.readBUILD(ctx, g3root, buildPath)
		if err != nil {
			return false, nil, err
		}
		for _, tr := range getRules(bld, "ts_library", ruleTypeTest) {
			// don't register all_test libraries themselves
			if isAllTestLibrary(bld, tr) {
				continue
			}
			platform.Infof("Registering test rule in closest ts_config & ts_development_sources")
			target := AbsoluteBazelTarget(bld, tr.Name())
			ancestorBuild, err := reg.registerTestRule(ctx, bld, tsConfig, g3root, target)
			if err != nil {
				return false, nil, err
			}
			if ancestorBuild != "" {
				updatedAncestorPackages[ancestorBuild] = true
			}
			// NodeJS rules should not be added to ts_development_sources automatically, because
			// they typically do not run in the browser.
			if tr.AttrString("runtime") != "nodejs" {
				ancestorBuild, err := reg.registerTestRule(ctx, bld, tsDevSrcs, g3root, target)
				if err != nil {
					return false, nil, err
				}
				if ancestorBuild != "" {
					updatedAncestorPackages[ancestorBuild] = true
				}
			}
		}
	}

	updated := false
	for b := range reg.filesToUpdate {
		fmt.Printf("Registered test(s) in %s\n", b.Path)
		fileChanged, err := upd.maybeWriteBUILD(ctx, filepath.Join(g3root, b.Path), b)
		if err != nil {
			return false, nil, err
		}
		updated = updated || fileChanged
	}

	return updated, updatedAncestorPackages, nil
}

// buildRegistry buffers reads and writes done while registering ts_libraries
// with ts_config and ts_development_sources rules, so that registers from
// multiple packages all get applied at once.
type buildRegistry struct {
	bldFiles      map[string]*build.File
	filesToUpdate map[*build.File]bool
}

func (reg *buildRegistry) readBUILD(ctx context.Context, workspaceRoot, buildFilePath string) (*build.File, error) {
	normalizedG3Path, err := getAbsoluteBUILDPath(workspaceRoot, buildFilePath)
	if err != nil {
		return nil, err
	}

	if bld, ok := reg.bldFiles[normalizedG3Path]; ok {
		return bld, nil
	}

	bld, err := readBUILD(ctx, workspaceRoot, buildFilePath)
	if err != nil {
		return nil, err
	}

	reg.bldFiles[normalizedG3Path] = bld

	return bld, nil
}

func (reg *buildRegistry) registerForPossibleUpdate(bld *build.File) {
	reg.filesToUpdate[bld] = true
}

type registerTarget int

const (
	tsConfig registerTarget = iota
	tsDevSrcs
)

func (rt registerTarget) kind() string {
	if rt == tsConfig {
		return "ts_config"
	}

	return "ts_development_sources"
}

func (rt registerTarget) ruleType() ruleType {
	if rt == tsConfig {
		return ruleTypeAny
	}

	return ruleTypeTest
}

// registerTestRule searches ancestor packages for a rule matching the register
// target and adds the given target to it. If an all_tests library is found, the
// rule is registered with it, instead of specified register target. Prints a
// warning if no rule is found, but only returns an error if adding the
// dependency fails.
func (reg *buildRegistry) registerTestRule(ctx context.Context, bld *build.File, rt registerTarget, g3root, target string) (string, error) {
	if buildHasDisableTaze(bld) {
		return "", nil
	}

	var ruleToRegister *build.Rule
	for _, r := range bld.Rules("") {
		if isAllTestLibrary(bld, r) {
			if hasDependency(bld, r, target) {
				return "", nil
			}

			// an all_tests library takes presidence over a registerTarget, and there
			// can only be one, since there can only be one rule with a given name, so
			// can just break after finding
			ruleToRegister = r
			break
		}
		if ruleMatches(bld, r, rt.kind(), rt.ruleType()) {
			if hasDependency(bld, r, target) {
				return "", nil
			}

			// keep overwriting ruleToRegister so the last match in the BUILD gets
			// used
			ruleToRegister = r
		}
	}

	if ruleToRegister != nil {
		addDep(bld, ruleToRegister, target)
		reg.registerForPossibleUpdate(bld)
		return filepath.Dir(bld.Path), nil
	}

	parentDir := filepath.Dir(filepath.Dir(bld.Path))
	for parentDir != "." && parentDir != "/" {
		buildFile := filepath.Join(g3root, parentDir, "BUILD")
		if _, err := platform.Stat(ctx, buildFile); err == nil {
			parent, err := reg.readBUILD(ctx, g3root, buildFile)
			if err != nil {
				return "", err
			}
			return reg.registerTestRule(ctx, parent, rt, g3root, target)
		}
		parentDir = filepath.Dir(parentDir)
	}
	fmt.Printf("WARNING: no %s rule in parent packages of %s to register with.\n",
		rt.kind(), target)
	return "", nil
}
