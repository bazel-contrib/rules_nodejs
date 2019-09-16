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

function terser(inputFile, outputFile, opts) {
  return cp.execFileSync(
      process.execPath, [terserWrap, inputFile, '--output', outputFile], opts || {env: []})
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
  })

  it('errors when cannot locate user defined terser binary', () => {
    fs.writeFileSync('soup.js', '"valid";');

    try {
      terser('soup.js', 'boop.js', {env: {TERSER_BINARY: 'DOES_NOT_EXIST'}})
    } catch (e) {
      assert.ok(e.status, 'exit code');
      stderr = e.stderr + ''
      console.error('------------------------')
      console.error(e.stdout + '')
      console.error(e.stderr + '')
      console.error('------------------------')
    }
  })

  // terser's default behavior waits for javascript from stdin if no arguments are provided.
  // this doesnt match with how we can use it in bazel so we disable this feature.
  it('exits when no arguments are provided.', async () => {
    await util.promisify(cp.execFile)(process.execPath, [terserWrap], {env: []});
  })

  it('errors when any file in a directory fails', () => {
    fs.mkdirSync('fruit')
    fs.mkdirSync('frout')
    fs.writeFileSync('fruit/apples.js', 'yay apple!');
    fs.writeFileSync('fruit/orange.js', '"orange.js"');
    stderr = '';
    try {
      terser('fruit', 'frout')
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

    assert.ok(
        fs.existsSync('frout/orange.js'),
        'even if one script has a parse error all other scripts should be processed.')
  });

  // always uses concurrency >= to the number of items to process
  // this excercies a code path where the pending work queue is never used.
  it('processes all files in a directory', () => {
    fs.mkdirSync('fruit2');
    fs.mkdirSync('frout2');
    fs.writeFileSync('fruit2/apples.js', '"apple";');
    fs.writeFileSync('fruit2/orange.js', '"orange!";');

    try {
      terser('fruit2', 'frout2', {env: {TERSER_CONCURRENCY: 2}})
    } catch (e) {
      assert.fail('should not have failed to process any javascript.')
    }

    assert.ok(fs.existsSync('frout2/orange.js'), 'minified js should have been created')
    assert.ok(fs.existsSync('frout2/apples.js'), 'minified js should have been created')
  });

  // this excercies the code path where work has to be queued an dequeued based on exhausting the
  // avaiable concurrency.
  it('processes all files in a directory with single concurrency', () => {
    fs.mkdirSync('fruit3');
    fs.mkdirSync('frout3');
    fs.writeFileSync('fruit3/apples.js', '"apple";');
    fs.writeFileSync('fruit3/orange.js', '"orange!";');

    try {
      terser('fruit3', 'frout3', {env: {TERSER_CONCURRENCY: 1}})
    } catch (e) {
      assert.fail('should not have failed to process any javascript.')
    }

    assert.ok(fs.existsSync('frout3/orange.js'), 'minified js should have been created')
    assert.ok(fs.existsSync('frout3/apples.js'), 'minified js should have been created')
  });
});
