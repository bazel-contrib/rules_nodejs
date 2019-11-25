package workspace

import (
	"fmt"
	"path/filepath"
)

// Root finds the closest google3 root from p.
func Root(p string) (string, error) {
	p, err := filepath.Abs(p)
	if err != nil {
		return "", fmt.Errorf("unable to determine google3 root from %s: %v", p, err)
	}

	for step := p; step != "/" && step != "."; step = filepath.Dir(step) {
		if filepath.Base(step) == "google3" {
			return step, nil
		}
	}
	return "", fmt.Errorf("unable to determine google3 root, no 'google3' in %s", p)
}

// Name returns the name of the workspace.
func Name() string {
	return "google3"
}
