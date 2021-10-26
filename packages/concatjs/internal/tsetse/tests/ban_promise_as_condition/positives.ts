// tslint:disable
async function returnsPromise() {
  return false;
}

function neverHitsElse() {
  if (returnsPromise()) {
    return true;
  } else {
    return false;
  }
}

async function asyncNeverHitsElse() {
  if (returnsPromise()) {
    return true;
  } else {
    return false;
  }
}

function detectsFunctionCalls() {
  const ternary = returnsPromise() ? 'always' : 'never';

  while (returnsPromise()) {
    // stuck in this loop
    break;
  }

  const binaryExpressionBarBar = returnsPromise() || 'other thing';
  const binaryExpressionAndAnd = returnsPromise() && 'other thing';
}

function detectsPropertyAccesses() {
  const prom = returnsPromise();

  // @ts-ignore TS2801
  const ternary = prom ? 'always' : 'never';

  while (prom) {
    // stuck in this loop
    break;
  }

  const binaryExpressionBarBar = prom || 'other thing';
  // @ts-ignore TS2801
  const binaryExpressionAndAnd = prom && 'other thing';
}
