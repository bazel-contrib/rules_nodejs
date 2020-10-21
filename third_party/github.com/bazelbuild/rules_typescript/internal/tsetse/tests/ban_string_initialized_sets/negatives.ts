// tslint:disable
function emptySet() {
  const set = new Set();
}

function noConstructorArgs() {
  const set = new Set;
}

function nonStringSet() {
  const set = new Set([1, 2, 3]);
}

// This is an allowable way to create a set of strings
function setOfStrings() {
  const set = new Set(['abc']);
}

function setOfChars() {
  const set = new Set('abc'.split(''));
}

function explicitlyAllowString() {
  const set = new Set('abc' as Iterable<string>);
}

// checks that just a property called 'Set' doesn't trigger the error
function justAKeyCalledSet(obj: {Set: {new (s: string): any}}) {
  const set = new obj.Set('abc');
}

function destructuredConstructorCalledSet(obj: {Set: {new (s: string): any}}) {
  const {Set} = obj;
  const set = new Set('abc');
}

function locallyDeclaredSet() {
  class Set {
    constructor(private s: string) {}
  }
  const set = new Set('abc');
}
