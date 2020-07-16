const format = require('date-fns').format;
const foo = require('@foo/lib').foo;

const date = format(new Date(2019, 4, 7), 'MMMM d, yyyy');
console.log(foo('lib'), date);