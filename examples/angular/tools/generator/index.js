if (process.argv[2] === '--clean') {
 require('./src/clean')();
}
else {
 require('./src/generate')(process.argv);
}
