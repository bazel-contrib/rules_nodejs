import {doStuff} from './lib';

describe('doStuff', () => {
  it('should do some stuff', () => {
    expect(doStuff('boom')).toContain('boom');
  });
});
