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

function fetch(url) {
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
  const content = [];

  content.push('""" Generated code; do not edit\nUpdate by running yarn update-esbuild-versions\n\nHelper macro for fetching esbuild versions for internal tests and examples in rules_nodejs\n"""\n');
  content.push('load("@bazel_tools//tools/build_defs/repo:http.bzl", "http_archive")\n')

  const latestVersion = (await fetch('https://registry.npmjs.org/esbuild/latest')).version;
  content.push(`_VERSION = "${latestVersion}"\n`);

  content.push('def esbuild_dependencies():');
  content.push('    """Helper to install required dependencies for the esbuild rules"""\n');
  content.push('    version = _VERSION\n');

  const tmpDir = tmpdir();
  mkdirSync(tmpDir, {recursive: true});

  for(const platform of Object.keys(PLATFORMS)) {
    const downloadUrl = `https://registry.npmjs.org/${PLATFORMS[platform]}/-/${PLATFORMS[platform]}-${latestVersion}.tgz`;

    const downloadPath = join(tmpDir, PLATFORMS[platform]);
    await downloadFile(downloadUrl, downloadPath);
    const shasumOutput = exec(`shasum -a 256 ${downloadPath}`, { silent: true }).stdout;
    const shasum = shasumOutput.split(' ')[0];


    content.push('    http_archive(');
    content.push(`        name = "${platform}",`);
    content.push('        urls = [');
    content.push(`            "https://registry.npmjs.org/${PLATFORMS[platform]}/-/${PLATFORMS[platform]}-%s.tgz" % version,`);
    content.push('        ],');
    content.push('        strip_prefix = "package",');
    content.push('        build_file_content = """exports_files(["bin/esbuild"])""",');
    content.push(`        sha256 = "${shasum}",`);
    content.push('    )');
  }


  rmdirSync(tmpDir, {recursive: true});

  console.log(content.join('\n'));
}

main();