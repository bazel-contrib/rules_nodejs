function increment(n) {
  return n + 1;
}

exports.increment = increment;

if (require.main === module) {
  if (process.argv.length < 3) {
    console.error('usage: program [number]');
    process.exitCode = 1;
    return;
  }
  console.log('Running program');
  const input = Number(process.argv[2]);
  console.log(`increment ${input} is ${increment(input)}`);
}
