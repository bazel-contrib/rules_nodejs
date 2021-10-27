import './jasmine_types';

function returnsPromise() {
  return Promise.resolve(true);
}

type Future = Promise<number>;
function aliasedPromise(): Future {
  return Promise.resolve(1);
}

class Extended extends Promise<number> {}
function extendedPromise(): Extended {
  return Promise.resolve(1);
}

class DoubleExtended extends Extended {}
function doubleExtendedPromise(): Extended {
  return Promise.resolve(1);
}

function maybePromise(): Promise<number>|number {
  return 3;
}

describe('example test', () => {
  it('should error when expecting promises toBeTruthy', async () => {
    const promise = returnsPromise();

    // Every expect here should fail the check.
    expect(promise).toBeTruthy();
    expect(maybePromise()).not.toBeTruthy();
    expect(maybePromise()).toBeTruthy();
    expect(returnsPromise()).toBeTruthy();
    expect(aliasedPromise()).toBeTruthy();
    expect(extendedPromise()).toBeTruthy();
    expect(doubleExtendedPromise()).toBeTruthy();
  });

  it('should allow awaited promises', async () => {
    const promise = returnsPromise();
    expect(await promise).toBeTruthy();
    expect(await maybePromise()).toBeTruthy();
    expect(await returnsPromise()).toBeTruthy();
    expect(await aliasedPromise()).toBeTruthy();
    expect(await extendedPromise()).toBeTruthy();
  });

  it('should only error for promises', async () => {
    expect('truthy').toBeTruthy();
    expect(1).toBeTruthy();
    expect(true).toBeTruthy();
    expect(null).not.toBeTruthy();
  });
});
