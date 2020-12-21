const _ = require('lodash');
const {increment} = require('./index');
const {decrement} = require('./decrement');

if (!_.eq(increment(1), 2)) {
  console.error('increment test failed');
  process.exitCode = 1;
}

if (!_.eq(decrement(1), 0)) {
  console.error('decrement test failed');
  process.exitCode = 1;
}
