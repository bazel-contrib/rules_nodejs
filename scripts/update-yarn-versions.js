// This script creates output that is copy/pasted into /internal/node/node_versions.bzl to
// add all published yarn packages < 2.0.0
// See the update-nodejs-versions script in package.json

const https = require('https');
const { execSync } = require('child_process');
const { mkdirSync, createWriteStream } = require('fs');
const { join } = require('path');
const { tmpdir } = require('os');

const MAX_VERSION = [1, 99, 99];

async function getJson(url) {
    return new Promise((resolve, reject) => {
        https.get(url, (res) => {
        if (res.statusCode !== 200) {
            console.error(res);
            return reject();
        }
        
        let body = '';
        res.on("data", (chunk) => body += chunk);
        res.on("end", () => resolve(JSON.parse(String(body))));
        });
    });
}
function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const file = createWriteStream(dest);

    https.get(url, (response) => response.pipe(file));
    file.on('finish', () => {
      file.end();
      resolve();
    }); 
  });
};

function versionCompare(lhs, rhs) {
  if (lhs[0] !== rhs[0]) {
    return lhs[0] - rhs[0];
  }
  if (lhs[1] !== rhs[1]) {
    return lhs[1] - rhs[1];
  }
  return lhs[2] - rhs[2];
}

async function getYarnVersions() {
  const json = await getJson("https://registry.npmjs.org/yarn");
  const versions = Object.values(json.versions);

  const validVersions = (versions.map(({ version }) => version.split('.').map(Number))
              .filter(
                  (version) => versionCompare(version, MAX_VERSION) <= 0)
              .sort(versionCompare)
              .map(version => version.join('.')));

  return validVersions.map(version => ({
    version,
    tar: json.versions[version].dist.tarball
  }));
}

async function getYarnSha(verObj, dir) {
  await downloadFile(verObj.tar, dir);
  return execSync(`shasum -a 256 ${dir}`, {silent: true, encoding: 'utf-8'}).split(' ')[0];
}

async function getYarnVersionsSha(yarnVersions) {
    const tmpDir = tmpdir();
    mkdirSync(tmpDir, {recursive: true});

    return await Promise.all(yarnVersions.map(async (obj) => {
      return {
        version: obj.version,
        sha: await getYarnSha(obj, join(tmpDir, obj.version)),
      }
    }));
}

async function main() {
  const versions = await getYarnVersions();
  const yarnVersions = await getYarnVersionsSha(versions);
  console.log('"""\nGenerated code; do not edit');
  console.log('Update by running yarn update-yarn-versions\n');
  console.log('Note that we don\'t support Yarn 2 yet, see');
  console.log('https://github.com/bazelbuild/rules_nodejs/issues/1599\n"""\n');
  // Suppress buildifier
  console.log('# @unsorted-dict-items');
  console.log('YARN_VERSIONS = {');
  yarnVersions.forEach(ver => {
    const value = `("yarn-v${ver.version}.tar.gz", "yarn-v${ver.version}", "${ver.sha}"),`;
    console.log(`    "${ver.version}": ${value}`);
  });
  console.log("}");
}

if (require.main === module) {
  main();
}
