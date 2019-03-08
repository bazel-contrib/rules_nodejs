#!/usr/bin/env bash

# Variables
readonly projectDir=$(realpath "$(dirname ${BASH_SOURCE[0]})/..")
readonly envHelpersPath="$projectDir/.circleci/env-helpers.inc.sh";

# Load helpers and make them available everywhere (through `$BASH_ENV`).
source $envHelpersPath;
echo "source $envHelpersPath;" >> $BASH_ENV;

####################################################################################################
# Define PUBLIC environment variables for CircleCI.
####################################################################################################
# ChromeDriver version compatible with the Chrome version included in the docker image used in
# `.circleci/config.yml`. See http://chromedriver.chromium.org/downloads for a list of versions.
# This variable is intended to be passed as an arg to the `webdriver-manager update` command (e.g.
# `"postinstall": "webdriver-manager update $CI_CHROMEDRIVER_VERSION_ARG"`).
setPublicVar CHROMEDRIVER_VERSION_ARG "--versions.chrome 2.45";

# Source `$BASH_ENV` to make the variables available immediately.
source $BASH_ENV;
