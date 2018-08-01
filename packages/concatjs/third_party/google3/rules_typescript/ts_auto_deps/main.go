package main

import (
	"flag"
	"fmt"
	"os"

	"github.com/bazelbuild/rules_typescript/ts_auto_deps/platform"
	"github.com/bazelbuild/rules_typescript/ts_auto_deps/updater"
)

var (
	isRoot = flag.Bool("root", false, "the given path is the root of a TypeScript project "+
		"(generates ts_config and ts_development_sources targets).")
	recursive = flag.Bool("recursive", false, "recursively update all packages under the given root.")
	files     = flag.Bool("files", false, "treats arguments as file names. Filters .ts files, then runs on their dirnames.")
)

func usage() {
	fmt.Fprintf(os.Stderr, `ts_auto_deps: generate BUILD rules for TypeScript sources.

usage: %s [flags] [path...]

ts_auto_deps generates and updates BUILD rules for each of the given package paths.
Paths are expected to reside underneath google3. If none is given, ts_auto_deps runs on
the current working directory.

For each of the given package paths, ts_auto_deps finds all TypeScript sources in the
package and adds sources that are not currently built to the appropriate
BUILD rule (ts_library or ts_declaration).

If there is no matching BUILD rule, or no BUILD file, ts_auto_deps will create either.

ts_auto_deps also updates BUILD rule dependencies ('deps') based on the source imports.

Flags:
`, os.Args[0])
	flag.PrintDefaults()
}

func main() {
	flag.Usage = usage
	flag.Parse()

	paths, err := updater.Paths(*isRoot, *files, *recursive)
	if err != nil {
		platform.Error(err)
	}

	host := updater.New(false, false, updater.QueryBasedBazelAnalyze, updater.LocalUpdateFile)
	if err := updater.Execute(host, paths, *isRoot, *recursive); err != nil {
		platform.Error(err)
	}
}
