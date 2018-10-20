const {check, files} = require('./check');

files.forEach(file => check(file, true));
