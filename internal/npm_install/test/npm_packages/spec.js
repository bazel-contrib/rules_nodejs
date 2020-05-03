const fs = require('fs');
const path = require('path');

describe('installing hybrid packages', () => {
  it('should work', () => {
    const content = fs.readFileSync(
        path.join(process.env['TEST_SRCDIR'], 'npm', 'bazel_workspaces_consistent', 'a.txt'),
        'utf-8');
    expect(content).toEqual('some content');
  });
});
