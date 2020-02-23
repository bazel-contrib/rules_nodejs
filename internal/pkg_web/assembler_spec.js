const assembler = require('./assembler');
const path = require('path');
const fs = require('fs');

describe('assembler', () => {
    const outdir = 'output';
    const volatilePath = 'path/to/volatile-status.txt';
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
    });

    it('should copy files', () => {
      assembler.main([outdir, volatilePath, '{}', '--assets', 'path/to/thing1.txt']);
      expect(fs.readdirSync('output/path/to')).toContain('thing1.txt');
      expect(fs.readFileSync('output/path/to/thing1.txt', {
        encoding: 'utf-8'
      })).toBe('some content');
    });

    it('should strip longest rootdir', () => {
      assembler.main(
          [outdir, volatilePath, '{}', 'path', 'path/to', '--assets', 'path/to/thing1.txt']);
      expect(fs.readdirSync('output')).toContain('thing1.txt');
    });

    it('should handle nested directories', () => {
      assembler.main([outdir, volatilePath, '{}', 'path', '--assets', 'path/to']);
      expect(fs.readdirSync('output/to')).toContain('thing1.txt');
    });

    it('should replace contents with static text', () => {
      assembler.main([
        outdir, volatilePath, '{"some content":"some other content"}', '--assets',
        'path/to/thing1.txt'
      ]);
      expect(fs.readFileSync('output/path/to/thing1.txt', {
        encoding: 'utf-8'
      })).toBe('some other content');
    })


    it('should replace contents with dynamic text from volatile file', () => {
      assembler.main(
          [outdir, volatilePath, '{"content":"{TEST_KEY}"}', '--assets', 'path/to/thing1.txt']);
      expect(fs.readFileSync('output/path/to/thing1.txt', {encoding: 'utf-8'})).toBe('some 41561');
    })
});