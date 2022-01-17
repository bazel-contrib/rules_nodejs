// This script creates output that is copy/pasted into /internal/node/node_versions.bzl to
// add all published yarn packages < 2.0.0
// See the update-nodejs-versions script in package.json

const https = require('https');
const { execSync } = require('child_process');
const { mkdirSync, createWriteStream } = require('fs');
const { join } = require('path');
const { tmpdir } = require('os');

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

function httpDownload(url, dest, resolve, reject) {
  https.get(url, (response) => {
    if(response.statusCode === 301 || response.statusCode === 302) {
      return httpDownload(response.headers.location, dest, resolve, reject)
    }

    if (response.statusCode === 404) {
      reject();
      return;
    }

    const file = createWriteStream(dest);

    response.pipe(file);

    file.on('finish', () => {
      file.end();
      resolve();
    });
  });
}

function downloadFile(url, dest) {
  return new Promise((resolve, reject) => httpDownload(url, dest, resolve, reject));
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
              .sort(versionCompare)
              .map(version => version.join('.')));

  return validVersions.map(version => ({
    version,
    name: `yarn-v${version}`,
    url: `https://github.com/yarnpkg/yarn/releases/download/v${version}/yarn-v${version}.tar.gz`,
    tar: `yarn-v${version}.tar.gz`
  }));
}

async function getYarnSha(url, dir) {
  await downloadFile(url, dir);
  return execSync(`shasum -a 256 ${dir}`, {silent: true, encoding: 'utf-8'}).split(' ')[0];
}

async function getYarnVersionsSha(yarnVersions) {
    const tmpDir = tmpdir();
    mkdirSync(tmpDir, {recursive: true});

    const data = [];
    for (const ver of yarnVersions) {
      try {
        const sha = await getYarnSha(ver.url, join(tmpDir, ver.version))
        const info = { ...ver, sha }
        data.push(info);
      } catch (e) {
        // not found
      }
    }

    return data;
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
    const value = `("${ver.tar}", "${ver.name}", "${ver.sha}"),`;
    console.log(`    "${ver.version}": ${value}`);
  });
  console.log("}");
}

if (require.main === module) {
  main();
}
