#!/bin/sh
set -u -e

readonly DOWNLOAD_URL="https://5-116431813-gh.circle-artifacts.com/0/pkg/bazel-remote-proxy-$(uname -s)_$(uname -m)"

curl --fail -o ~/bazel-remote-proxy "$DOWNLOAD_URL"
chmod +x ~/bazel-remote-proxy
