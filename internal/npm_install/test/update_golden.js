const {runGenerator, check, files} = require('./check');

runGenerator();
files.forEach(file => check(file, true));
