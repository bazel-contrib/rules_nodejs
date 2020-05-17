const fs = require('fs');

function main([packageJsonPath, packageName, target, output]) {
  const failures = [], buildozerCmds = [];
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
  if (packageJson.name !== packageName) {
    failures.push(`attribute package_name=${packageName} does not match package.json name = "${
        packageJson.name}"`);
    buildozerCmds.push(`set package_name "${packageJson.name}"`)
  }

  if (failures.length > 0) {
    console.error(`ERROR: pkg_npm rule ${
        target} was configured with attributes that don't match the package.json file:`);
    failures.forEach(f => console.error(' - ' + f));
    console.error('\nYou can automatically fix this by running:');
    console.error(
        `    npx @bazel/buildozer ${buildozerCmds.map(c => `'${c}'`).join(' ')} ${target}`);
    console.error('Or to suppress this error, run:');
    console.error(`    npx @bazel/buildozer 'set validate False' ${target}`);
    return 1;
  }

  // We have to write an output so that Bazel needs to execute this action.
  // Make the output change whenever the attributes changed.
  require('fs').writeFileSync(
      output, `
  // ${process.argv[1]} checked attributes for ${target}
  // packageName:           ${packageName}
  `,
      'utf-8');
  return 0;
}

if (require.main === module) {
  try {
    process.exitCode = main(process.argv.slice(2));
  } catch (e) {
    console.error(process.argv[1], e);
  }
}
