const path = require('path');

console.log('hello ' + require.resolve('./other.js', {paths: [path.join(__dirname, 'other')]}));
