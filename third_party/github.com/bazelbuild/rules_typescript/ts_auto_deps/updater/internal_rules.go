// Excluded from the open-source version since there are no equivalent rules
// to ts_config and ts_development_sources.

package updater

import (
	"path/filepath"
	"strings"

	"google3/third_party/bazel_buildifier/build/build"
	"google3/third_party/bazel_buildifier/edit/edit"
	"github.com/bazelbuild/rules_typescript/ts_auto_deps/platform"
)

// updateTSConfig creates new ts_config rules, as well as registers non-test ts
// rules with the ts_config.  Test ts rules are handled in test_register.go.
func updateTSConfig(bld *build.File, add bool) {
	if add && getLastRule(bld, "ts_config", ruleTypeAny) == nil {
		r := getOrCreateRule(bld, "tsconfig", "ts_config", ruleTypeAny)
		r.SetAttr("deps", &build.ListExpr{})
	}

	// register any non-test rules
	r := getLastRule(bld, "ts_config", ruleTypeAny)
	if r == nil {
		return // No ts_config rule that needs updating.
	}
	targets := allTSRules(bld)
	for _, t := range targets {
		isTest := attrTruthy(t, "testonly")
		if isTest {
			// registering test rules with ts_config is done in test_register.go
			continue
		}
		addDep(bld, r, t.Name())
	}
}

// updateTSDevelopmentSources creates new ts_development_sources rules, as well
// as registers non-test ts rules with the ts_development_sources.  Test ts
// rules are handled in test_register.go.
func updateTSDevelopmentSources(bld *build.File, add bool) {
	if add {
		ruleName := "devsrcs"
		if getLastRule(bld, "ts_development_sources", ruleTypeRegular) == nil {
			r := getOrCreateRule(bld, ruleName, "ts_development_sources", ruleTypeRegular)
			r.SetAttr("deps", &build.ListExpr{})
		}
		if getLastRule(bld, "ts_development_sources", ruleTypeTest) == nil {
			r := getOrCreateRule(bld, ruleName, "ts_development_sources", ruleTypeTest)
			r.SetAttr("deps", &build.ListExpr{})
		}
	}

	// register any non-test rules
	for _, t := range allTSRules(bld) {
		// NodeJS rules should not be added to ts_development_sources automatically
		// because they typically do not run in the browser.
		if t.AttrString("runtime") == "nodejs" {
			continue
		}
		isTest := attrTruthy(t, "testonly")
		if isTest {
			// registering test rules with ts_dev_srcs is done in test_register.go
			continue
		}
		depName := ":" + t.Name()
		if targetRegisteredInRule(bld, "ts_development_sources", ruleTypeRegular, depName) {
			continue
		}
		r := getLastRule(bld, "ts_development_sources", ruleTypeRegular)
		if r == nil {
			continue // No devsources rule that needs updating.
		}
		addDep(bld, r, depName)
	}
}

// updateGenWizTS updates the sources of gen_wiz_ts() build rules referenced
// from ts_library()s.
func updateGenWizTS(bld *build.File) {
	// For each ts_library, check if it references a gen_wiz_ts() rule in its srcs
	for _, r := range buildRules(bld, "ts_library") {
		srcs := r.AttrStrings("srcs")
		var genWizRule *build.Rule
		for _, src := range srcs {
			if !strings.HasPrefix(src, ":") {
				continue
			}
			candidate := edit.FindRuleByName(bld, strings.TrimPrefix(src, ":"))
			if candidate != nil && candidate.Kind() == "gen_wiz_ts" {
				genWizRule = candidate
				break
			}
		}
		// If so, add each source file ending with a wiz suffix to its srcs.
		if genWizRule != nil {
			addWizSrcsToTarget(bld, genWizRule, srcs)
		}
	}
}

var wizSuffixes = []string{
	"controller.ts",
	"model.ts",
	"renderer.ts",
	"processor.ts",
	"service.ts",
	"interface.ts",
}

// addWizSrcsToTarget adds any entry from srcs to the sources of the given rule
// if it is a Wiz source (matches one of the suffixes).
func addWizSrcsToTarget(bld *build.File, rule *build.Rule, srcs []string) {
	platform.Infof("Adding wiz sources to target %s:%s: %q", filepath.Dir(bld.Path), rule.Name(), srcs)
srcLoop:
	for _, src := range srcs {
		for _, suffix := range wizSuffixes {
			if strings.HasSuffix(src, suffix) {
				addToSrcsClobbering(bld, rule, src)
				continue srcLoop
			}
		}
	}
}
