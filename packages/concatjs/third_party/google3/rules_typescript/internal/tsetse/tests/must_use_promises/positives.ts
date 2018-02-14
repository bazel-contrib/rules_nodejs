function isPromise() {
  return Promise.resolve(1);
}

function maybePromise(): Promise<number>|number {
  return Promise.resolve(1);
}

type Future = Promise<number>;
function aliasedPromise(): Future {
  return Promise.resolve(1);
}

class Extended extends Promise<number> {}

function extendedPromise(): Extended {
  return Promise.resolve(1);
}

function usePromise(maybePromise: Promise<number>|number) {
  return false;
}

async function returnLaterPromise() {
  return () => Promise.resolve(1);
}

async function unusedPromises() {
  isPromise();
  maybePromise();
  aliasedPromise();
  extendedPromise();
  const later = await returnLaterPromise();
  later();
}

async function hasAwait() {
  await isPromise();
  await maybePromise();
  await aliasedPromise();
  await extendedPromise();
  const later = await returnLaterPromise();
  await later();
  usePromise(maybePromise());
}

function nonAsyncFunction() {
  isPromise();
  maybePromise();
  aliasedPromise();
  extendedPromise();
  const future = maybePromise();
  usePromise(future);
}
