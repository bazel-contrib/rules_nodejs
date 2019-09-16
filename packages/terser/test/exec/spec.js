const fs = require('fs');
const cp = require('child_process');
const path = require('path');
const util = require('util');
const assert = require('assert');

const terserWrap = path.join(process.env.RUNFILES, 'npm_bazel_terser', 'index.js')
if (!fs.existsSync(terserWrap)) {
  throw new Error(
      'expected to find terserwrap javascript file at \n' + terserWrap + '\nbut it does not exist!')
}

function terser(inputFile, outputFile) {
  return cp.execFileSync(
      process.execPath, [terserWrap, inputFile, '--output', outputFile], {env: []})
}


console.log('4444444444444444444444444444444444444444444444444444')

describe('run terser', () => {
  it('should fail', () => {
    let thrown = false
    try {
      terser('loop.js', 'boop.js')
    } catch (e) {
      assert.strictEqual(e.status, 1, 'exit code should be 1');
      thrown = true;
    }
    assert.ok(thrown, 'should have thrown on missing inpout file.')

    fs.writeFileSync('soup.js', 'omg soup!');

    let stderr = '';
    try {
      terser('soup.js', 'boop.js')
    } catch (e) {
      assert.ok(e.status, 'exit code');
      stderr = e.stderr + ''
      console.error('------------------------')
      console.error(e.stdout + '')
      console.error(e.stderr + '')
      console.error('------------------------')
    }

    assert.ok(
        stderr.indexOf('Parse error at') > -1, 'should have parse error in output from terser.')

    fs.mkdirSync('fruit')
    fs.writeFileSync('fruit/apples.js', 'yay apple!');

    stderr = '';
    try {
      terser('fruit', 'fruit')
    } catch (e) {
      assert.strictEqual(e.status, 2, 'exit code 2');
      stderr = e.stderr + ''
      console.error('------------------------')
      console.error(e.stdout + '')
      console.error(e.stderr + '')
      console.error('------------------------')
    }

    assert.ok(
        stderr.indexOf('Parse error at') > -1, 'should have parse error in output from terser.');
  });
});
