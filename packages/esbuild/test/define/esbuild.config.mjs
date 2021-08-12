import {readFileSync} from 'fs';

function parseStatusFile(p) {
    if (!p) return [];
    const results = {};
    const statusFile = readFileSync(p, { encoding: 'utf-8' });
    for (const match of `\n${statusFile}`.matchAll(/^([A-Z_]+) (.*)/gm)) {
        // Lines which go unmatched define an index value of `0` and should be skipped.
        if (match.index === 0) {
            continue;
        }
        results[match[1]] = match[2];
    }
    return results;
}

// Parse the stamp file produced by Bazel from the version control system
let version = '<unknown>';

// This undefined variable will be replaced with the full path during the build.
const statuses = parseStatusFile(process.env.BAZEL_VERSION_FILE);
// Don't assume BUILD_SCM_VERSION exists
if (statuses['BUILD_SCM_VERSION']) {
    version = 'v' + statuses['BUILD_SCM_VERSION'];
}

export default {
    define: {
        'BUILD_SCM_VERSION': `"${version}"`,
        'process.env.NODE_ENV': `"NOT_THIS"`
    }
}
