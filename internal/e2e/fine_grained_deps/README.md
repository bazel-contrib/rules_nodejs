## Testing optional dependencies

chokidar in package.json has an optionalDependency on fsevents which only
installs on OSX and does not install on Windows and linux. This dep here will test
optionalDependencies for npm_install and yarn_install on all three platforms in CI
