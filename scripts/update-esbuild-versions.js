const https = require("https");
const { exec } = require('shelljs');
const { mkdirSync, rmdirSync, createWriteStream } = require('fs');
const { join } = require('path');
const { tmpdir } = require('os');

const PLATFORMS = {
  "esbuild_darwin": "esbuild-darwin-64",
  "esbuild_windows": "esbuild-windows-64",
  "esbuild_linux": "esbuild-linux-64"
}

function getUrlAsString(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode !== 200) {
        console.error(res);
        return reject();
      }
      
      let body = '';
      res.on("data", (chunk) => body += chunk);
      res.on("end", () => resolve(String(body)));
    });
  });
}

function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const file = createWriteStream(dest);

    const request = https.get(url, (response) => {
        response.pipe(file);
    });

    file.on('finish', () => {
      file.end();
      resolve();
    });
  });
};

async function main() {
  console.log('""" Generated code; do not edit\nUpdate by running yarn update-esbuild-versions\n\nHelper macro for fetching esbuild versions for internal tests and examples in rules_nodejs\n"""\n');
  console.log('load("@bazel_tools//tools/build_defs/repo:http.bzl", "http_archive")\n')

  const latestVersion = JSON.parse(await getUrlAsString('https://registry.npmjs.org/esbuild/latest')).version;
  console.log(`_VERSION = "${latestVersion}"\n`);

  console.log('def esbuild_dependencies():');
  console.log('    """Helper to install required dependencies for the esbuild rules"""\n');
  console.log('    version = _VERSION\n');

  const tmpDir = tmpdir();
  mkdirSync(tmpDir, {recursive: true});

  for(const platform of Object.keys(PLATFORMS)) {
    const downloadUrl = `https://registry.npmjs.org/${PLATFORMS[platform]}/-/${PLATFORMS[platform]}-${latestVersion}.tgz`;

    const downloadPath = join(tmpDir, PLATFORMS[platform]);
    await downloadFile(downloadUrl, downloadPath);
    const shasumOutput = exec(`shasum -a 256 ${downloadPath}`, { silent: true }).stdout;
    const shasum = shasumOutput.split(' ')[0];


    console.log('    http_archive(');
    console.log(`        name = "${platform}",`);
    console.log('        urls = [');
    console.log(`            "https://registry.npmjs.org/${PLATFORMS[platform]}/-/${PLATFORMS[platform]}-%s.tgz" % version,`);
    console.log('        ],');
    console.log('        strip_prefix = "package",');
    console.log('        build_file_content = """exports_files(["bin/esbuild"])""",');
    console.log(`        sha256 = "${shasum}",`);
    console.log('    )');
  }


  rmdirSync(tmpDir, {recursive: true});
}

main();