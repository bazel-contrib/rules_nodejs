const https = require('https');
const { exec } = require('shelljs');
const { mkdirSync, createWriteStream, readFileSync, writeFileSync } = require('fs');
const { join } = require('path');
const { tmpdir } = require('os');

const PLATFORMS = {
  "_DARWIN_AMD64": "esbuild-darwin-64",
  "_DARWIN_ARM64": "esbuild-darwin-arm64",
  "_LINUX_AMD64": "esbuild-linux-64",
  "_LINUX_ARM64": "esbuild-linux-arm64",
  "_WINDOWS_AMD64": "esbuild-windows-64"
}

function replaceFileContent(filepath, replacements) {
  let fileContent = readFileSync(filepath, 'utf8');

  replacements.forEach(replacement => {
    const match = replacement[0].exec(fileContent);

    if(match.length > 1) {
      fileContent = fileContent.replace(match[1], replacement[1]);
    }
  });

  writeFileSync(filepath, fileContent);
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

    https.get(url, (response) => response.pipe(file));
    file.on('finish', () => {
      file.end();
      resolve();
    }); 
  });
};

async function main() {
  if(process.argv.length !== 2 && process.argv.length !== 3) {
    console.log("Expected number of arguments is 0 or 1");
    process.exit(1);
  }

  let version;
  if(process.argv.length === 3) {
    version = process.argv[2];
  } else {
    version = (await fetch('https://registry.npmjs.org/esbuild/latest')).version;
  }

  const tmpDir = tmpdir();
  mkdirSync(tmpDir, {recursive: true});

  const replacements = await Promise.all(Object.entries(PLATFORMS).map(async ([_var, platform]) => {
    const downloadPath = join(tmpDir, platform);

    await downloadFile(`https://registry.npmjs.org/${platform}/-/${platform}-${version}.tgz`, downloadPath);
    const shasum = exec(`shasum -a 256 ${downloadPath}`, {silent: true}).stdout.split(' ')[0];

    return [new RegExp(`${_var}_SHA = "(.+?)"`, 's'), shasum];
  }));

  replacements.push([/_VERSION = "(.+?)"/, version]);
  replaceFileContent('toolchains/esbuild/esbuild_packages.bzl', replacements);

  // update package.json used for API wrapper
  replaceFileContent('toolchains/esbuild/package.json', [[/"esbuild": "(.+?)"/, version]]);
  exec(`npm i --package-lock-only`, {silent: true, cwd: 'toolchains/esbuild'});
}

main();