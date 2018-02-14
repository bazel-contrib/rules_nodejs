import {noAwait} from 'google3/javascript/typescript/contrib/async';

function returnsPromise() {
  return Promise.resolve(1);
}

async function unusedPromises() {
  noAwait(returnsPromise());
}
