package platform

import (
	"fmt"
	"log"
	"os"
)

// Infof prints a formatted message to stdout.
func Infof(format string, args ...interface{}) {
	fmt.Printf(format+"\n", args...)
}

// Error prints a series of args to stderr.
func Error(args ...interface{}) {
	fmt.Fprintln(os.Stderr, args...)
}

// Fatalf prints a formatted message to stderr. Panics after printing.
func Fatalf(format string, v ...interface{}) {
	log.Fatalf(format, v...)
}
