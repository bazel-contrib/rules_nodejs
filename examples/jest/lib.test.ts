import {echo} from './lib';

describe('echo', () => {
  it('should return input', () => {
    expect(echo('boom')).toContain('boom');
  });
});
