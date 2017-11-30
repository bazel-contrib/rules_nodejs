package main

import (
	"flag"
	"fmt"
	"net/http"
	"os"
	"strings"

	"github.com/bazelbuild/rules_typescript/internal/concatjs/concatjs"
	"github.com/bazelbuild/rules_typescript/internal/devserver/devserver"
)

var (
	port        = flag.Int("port", 5432, "server port to listen on")
	base        = flag.String("base", "", "server base (required, runfiles of the binary)")
	pkgs        = flag.String("packages", "", "root package(s) to serve, comma-separated")
	manifest    = flag.String("manifest", "", "sources manifest (.MF)")
	servingPath = flag.String("serving_path", "/_/ts_scripts.js", "path to serve the combined sources at")
)

func main() {
	flag.Parse()

	if *base == "" || len(*pkgs) == 0 || (*manifest == "") {
		fmt.Fprintf(os.Stderr, "Required argument not set\n")
		os.Exit(1)
	}

	if _, err := os.Stat(*base); err != nil {
		fmt.Fprintf(os.Stderr, "Cannot read server base %s: %v\n", *base, err)
		os.Exit(1)
	}

	http.Handle(*servingPath, concatjs.ServeConcatenatedJS(*manifest, *base, nil /* realFileSystem */))
	pkgList := strings.Split(*pkgs, ",")
	http.HandleFunc("/", devserver.CreateFileHandler(*servingPath, *manifest, pkgList, *base))

	h, err := os.Hostname()
	if err != nil {
		h = "localhost"
	}

	fmt.Printf("Server listening on http://%s:%d/\n", h, *port)
	fmt.Fprintln(os.Stderr, http.ListenAndServe(fmt.Sprintf(":%d", *port), nil).Error())
	os.Exit(1)
}
