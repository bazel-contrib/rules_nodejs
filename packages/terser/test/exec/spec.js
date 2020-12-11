const fs = require('fs');
const cp = require('child_process');
const util = require('util');
const assert = require('assert');
const runfiles = require(process.env['BAZEL_NODE_RUNFILES_HELPER']);
const terserWrap = runfiles.resolve('build_bazel_rules_nodejs/packages/terser/index.js');

if (!fs.existsSync(terserWrap)) {
  throw new Error(
      'expected to find terserwrap javascript file at \n' + terserWrap + '\nbut it does not exist!')
}

if (process.platform === 'win32' && process.versions.node.split('.')[0] < 12) {
  // skip this test if we're on node10.
  // TODO: remove this when node 12 is the default
  console.error(
      'this test is only run on windows with nodejs >= 12 because there is an issue with spawning processes and ENOMEM errors.')
  process.exit(0)
}

function terser(inputFile, outputFile, opts, attempts = 0) {
  return cp.execFileSync(
      process.execPath, [terserWrap, inputFile, '--output', outputFile], opts || {env: []})
}

describe('run terser', () => {
  it('should fail', () => {
    let thrown = false
    try {
      terser('loop.js', 'boop.js')
    } catch (e) {
      console.error(e, e + '')
      assert.strictEqual(e.status, 1, 'exit code should be 1');
      thrown = true;
    }
    assert.ok(thrown, 'should have thrown on missing input file.')

    fs.writeFileSync('soup.js', 'omg soup!');

    let stderr = '';
    try {
      terser('soup.js', 'boop.js')
    } catch (e) {
      assert.ok(e.status, 'exit code');
      stderr = e.stderr + ''
    }

    assert.ok(
        stderr.indexOf('Parse error at') > -1, 'should have parse error in output from terser.')
  })

  it('errors when cannot locate user defined terser binary', () => {
    fs.writeFileSync('soup.js', '"valid";');

    try {
      terser('soup.js', 'boop.js', {env: {TERSER_BINARY: 'DOES_NOT_EXIST'}})
    } catch (e) {
      console.error(e, e + '')
      assert.ok(e.status, 'exit code');
      stderr = e.stderr + ''
    }
  })

  // terser's default behavior waits for javascript from stdin if no arguments are provided.
  // this doesnt match with how we can use it in bazel so we disable this feature.
  it('exits when no arguments are provided.', async () => {
    await util.promisify(cp.execFile)(process.execPath, [terserWrap], {env: []});
  })

  it('errors when any file in a directory fails', () => {
    // retries are not run in clean directories
    try {
      fs.mkdirSync('fruit')
      fs.mkdirSync('frout')
    } catch (e) {
    }

    fs.writeFileSync('fruit/apples.js', 'yay apple!');
    fs.writeFileSync('fruit/orange.js', '"orange.js"');
    stderr = '';
    try {
      terser('fruit', 'frout')
    } catch (e) {
      console.log(e + '', e.status, e.stderr + '', e.stdout + '')

      assert.strictEqual(e.status, 2, 'exit code 2');
      stderr = e.stderr + ''
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
    // retries are not run in clean directories.
    try {
      fs.mkdirSync('fruit2');
      fs.mkdirSync('frout2');
    } catch (e) {
    }

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
    // retries are not run in clean directories
    try {
      fs.mkdirSync('fruit3');
      fs.mkdirSync('frout3');
    } catch (e) {
    }

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
