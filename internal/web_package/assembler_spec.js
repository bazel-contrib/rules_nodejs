const assembler = require('./assembler');
const path = require('path');
const fs = require('fs');

describe('assembler', () => {
    const outdir = 'output';
    beforeEach(() => {
        const now = Date.now();
        // prevent test isolation failures by running each spec in a separate dir
        const uniqueDir = path.join(process.env['TEST_TMPDIR'], String(now));
        fs.mkdirSync(uniqueDir);
        process.chdir(uniqueDir);
        fs.mkdirSync('path');
        fs.mkdirSync('path/to');
        fs.writeFileSync('path/to/thing1.txt', 'some content', {encoding: 'utf-8'});

    });

    it('should copy files', () => {
        assembler.main([outdir, '--assets', 'path/to/thing1.txt']);
        expect(fs.readdirSync('output/path/to')).toContain('thing1.txt');
        expect(fs.readFileSync('output/path/to/thing1.txt', {encoding: 'utf-8'})).toBe('some content');
    });

    it('should strip longest rootdir', () => {
        assembler.main([outdir, 'path', 'path/to', '--assets', 'path/to/thing1.txt']);
        expect(fs.readdirSync('output')).toContain('thing1.txt');
    });

    it('should handle nested directories', () => {
        assembler.main([outdir, 'path', '--assets', 'path/to']);
        expect(fs.readdirSync('output/to')).toContain('thing1.txt');
    });
});