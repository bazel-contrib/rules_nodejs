const assembler = require('./assembler.cjs');
const path = require('path');
const fs = require('fs');

describe('assembler', () => {
  const outdir = 'output';
  const volatilePath = 'path/to/volatile-status.txt';
  const stablePath = 'path/to/stable-status.txt';
  let testCount = 0;
  beforeEach(() => {
    const now = Date.now() + String(testCount++);
    // prevent test isolation failures by running each spec in a separate dir
    const uniqueDir = path.join(process.env['TEST_TMPDIR'], String(now));
    fs.mkdirSync(uniqueDir);
    process.chdir(uniqueDir);
    fs.mkdirSync('path');
    fs.mkdirSync('path/to');
    fs.writeFileSync('path/to/thing1.txt', 'some content', {encoding: 'utf-8'});
    fs.writeFileSync(volatilePath, 'TEST_KEY 41561')
    fs.writeFileSync(stablePath, 'STABLE_GIT_VERSION 123abc')
  });

  it('should copy files', () => {
    assembler.main([outdir, '', '', '{}', '--assets', 'path/to/thing1.txt']);
    expect(fs.readdirSync('output/path/to')).toContain('thing1.txt');
    expect(fs.readFileSync('output/path/to/thing1.txt', {encoding: 'utf-8'})).toBe('some content');
  });

  it('should strip longest rootdir', () => {
    assembler.main([outdir, '', '', '{}', 'path', 'path/to', '--assets', 'path/to/thing1.txt']);
    expect(fs.readdirSync('output')).toContain('thing1.txt');
  });

  it('should handle nested directories', () => {
    assembler.main([outdir, '', '', '{}', 'path', '--assets', 'path/to']);
    expect(fs.readdirSync('output/to')).toContain('thing1.txt');
  });

  it('should replace contents with static text', () => {
    assembler.main([
      outdir, '', '', '{"some content":"some other content"}', '--assets', 'path/to/thing1.txt'
    ]);
    expect(fs.readFileSync('output/path/to/thing1.txt', {
      encoding: 'utf-8'
    })).toBe('some other content');
  })


  it('should replace contents with dynamic text from Bazel workspace status', () => {
    assembler.main([
      outdir, volatilePath, stablePath, '{"some":"{STABLE_GIT_VERSION}", "content":"{TEST_KEY}"}',
      '--assets', 'path/to/thing1.txt'
    ]);
    expect(fs.readFileSync('output/path/to/thing1.txt', {encoding: 'utf-8'})).toBe('123abc 41561');
  })
});
