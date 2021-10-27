// tslint:disable
function returnsSynchronous(): boolean {
  return false;
}

async function returnsPromise() {
  return false;
}

async function asyncDoesHitElse() {
  if (returnsSynchronous()) {
    return true;
  } else {
    return false;
  }
}

function synchronousIsntAffected() {
  if (returnsSynchronous()) {
    console.log(true);
  } else {
    console.log(false);
  }

  const ternary = returnsSynchronous() ? 'always' : 'never';

  while (returnsSynchronous()) {
    // stuck in this loop
    break;
  }

  const a = returnsSynchronous() || 'other thing';
}

async function properlyAwaitedGivesNoBuildErrorsDirectCall() {
  if (await returnsPromise()) {
    console.log(true);
  } else {
    console.log(false);
  }

  const ternary = await returnsPromise() ? 'always' : 'never';

  while (await returnsPromise()) {
    // No longer stuck in this loop
    break;
  }

  const binaryExpressionBarBar = await returnsPromise() || 'other thing';
  const binaryExpressionAndAnd = await returnsPromise() && 'other thing';
}

async function properlyAwaitedGivesNoBuildErrorsPropertyAccess() {
  const prom = returnsPromise();
  if (await prom) {
    console.log(true);
  } else {
    console.log(false);
  }

  const ternary = await prom ? 'always' : 'never';

  while (await prom) {
    // No longer stuck in this loop
    break;
  }

  const binaryExpressionBarBar = await prom || 'other thing';
  const binaryExpressionAndAnd = await prom && 'other thing';
}

const savedPromise = returnsPromise();

// These two verify that it doesn't tag = as a BinaryExpression when it should
// only catch || and &&
function takesPromise(prom: Promise<boolean>) {}

function s() {
  let p = returnsPromise();

  takesPromise(p = returnsPromise());
}

// This verifies that Promise|null can still be checked with an if
function takesPromiseMaybe(prom: Promise<boolean>|null|undefined) {
  if (prom) {
    // do stuff
  }
}

// Checking something exists with && before calling it is legitimate
const boo = {
  sendPromise: async () => {
    return true;
  }
};
