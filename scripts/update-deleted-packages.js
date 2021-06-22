// Called from package.json script to re-write the .bazelrc file with a setting that
// treats directories under e2e and examples as plain files, not Bazel packages.
const {readFileSync, writeFileSync, readdirSync, lstatSync} = require('fs');
const {join, basename, dirname} = require('path');

const pattern = /((build|query) --deleted_packages=).*/;
const content = readFileSync('.bazelrc', 'utf-8').split('\n');
function collectNested(dir, result) {
    readdirSync(dir).filter(
        f => f !== 'node_modules'
    ).map(
        f => join(dir, f)
    ).forEach(f => {
        if (lstatSync(f).isDirectory()) {
            collectNested(f, result)
        } else if (dir.includes('/') && (basename(f) === 'BUILD' || basename(f) === 'BUILD.bazel')) {
            result.push(dirname(f))
        }
    });
}
const deleted_packages = []
collectNested('e2e', deleted_packages);
collectNested('examples', deleted_packages);

writeFileSync('.bazelrc', content.map(line => {
    const match = line.match(pattern);
    if (match) {
        return match[1] + deleted_packages.sort().join(',');
    }
    return line;
}).join('\n'));
