# @bazel/runfiles

This package provides a basic set of utilities for resovling runfiles within NodeJS scripts
executed through `nodejs_binary` or `nodejs_test`.

Runfile resolution is desirable if your workspace intends to support users that cannot rely
on runfile forest symlinking (most commonly affected are Windows machines).
