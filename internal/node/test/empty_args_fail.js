// Used to test that there is no empty argument
// sent to the program when the argument list is empty.
// Some programs do not handle empty arguments gracefully

var theArgs = process.argv.slice(2);

if (theArgs.length != 0) {
  // Non-zero exit code if the argument list is not empty
  console.error(theArgs)
  process.exit(42)
}
