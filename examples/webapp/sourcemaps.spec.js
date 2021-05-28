// Ensure we have working sourcemaps when the app runs in a browser

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const sm = require('source-map');

const PRAGMA = '//# sourceMappingURL=';
const DATA = 'data:application/json;charset=utf-8;base64,';

function read(...f) {
  return fs.readFileSync(require.resolve(path.join(__dirname, ...f)), 'utf-8');
}

function parseSourceMap(content) {
  const sourcemapLine = content.split(/\r?\n/).find(l => l.startsWith(PRAGMA));
  if (!sourcemapLine) {
    throw new Error(`no ${PRAGMA} found in ${content}`);
  }
  return JSON.parse(Buffer.from(sourcemapLine.slice(PRAGMA.length + DATA.length), 'base64'));
}

function readSourceMap(...f) {
  return JSON.parse(fs.readFileSync(require.resolve(path.join(__dirname, ...f))));
}

function find(text, s = 'ts1') {
  const lines = text.split(/\r?\n/);
  for (let line = 1; line <= lines.length; line++) {
    const column = lines[line - 1].indexOf(s);
    if (column >= 0) {
      return {line, column};
    }
  }
}

function asserts(pos) {
  // This doesn't work because the output dir is different from input
  // so it actually starts with a bunch of '/../..'
  // expect(pos.source).toBe('index.js');

  assert(pos.source.endsWith('index.js'));
  assert(pos.line == 7);     // one-based
  assert(pos.column == 20);  // zero-based
}

describe('application sourcemaps in the browser', () => {
  it('should work after rollup', async () => {
    const content = read('app_chunks', 'index.js');
    const rawSourceMap = parseSourceMap(content);
    await sm.SourceMapConsumer.with(rawSourceMap, null, consumer => {
      asserts(consumer.originalPositionFor(find(content)));
    });
  });

  it('should work after terser', async () => {
    const content = read('app_chunks.min', 'index.js');
    const rawSourceMap = readSourceMap('app_chunks.min', 'index.js.map');
    await sm.SourceMapConsumer.with(rawSourceMap, null, consumer => {
      asserts(consumer.originalPositionFor(find(content)));
    });
  });

  it('should work after babel', async () => {
    const content = read('app_chunks_es5', 'index.js');
    const rawSourceMap = parseSourceMap(content);
    await sm.SourceMapConsumer.with(rawSourceMap, null, consumer => {
      asserts(consumer.originalPositionFor(find(content)));
    });
  });

  it('should work after babel+terser', async () => {
    const content = read('app_chunks_es5.min', 'index.js');
    const rawSourceMap = readSourceMap('app_chunks_es5.min', 'index.js.map');
    await sm.SourceMapConsumer.with(rawSourceMap, null, consumer => {
      asserts(consumer.originalPositionFor(find(content)));
    });
  });
});
