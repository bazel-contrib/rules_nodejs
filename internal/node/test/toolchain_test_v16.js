const version = 'v16.10.0';
if (version !== process.version) {
  console.error(`there is a mismatch with the nodejs toolchain called and used for nodejs_binary: expected: ${version}, found: ${process.version}`);
  process.exitCode = 1;
}
