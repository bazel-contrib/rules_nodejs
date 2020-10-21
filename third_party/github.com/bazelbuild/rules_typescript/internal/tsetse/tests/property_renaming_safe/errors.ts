/* tslint:disable */
interface IdxSig {
  [key: string]: string;
}

function propAccess(x: IdxSig) {
  x.prop;     // error
  x['prop'];  // ok
}

function descructuring(x: IdxSig) {
  const {prop} = x;  // ok, but should be an error.
}

interface MixedIdxSig extends IdxSig {
  namedProp: string;
}

function mixedPropAccess(x: MixedIdxSig) {
  x.namedProp;     // ok
  x['namedProp'];  // ok
  x.prop;          // error
  x['prop'];       // ok
}

function genericAccess<T extends IdxSig>(x: T) {
  x.prop;     // error
  x['prop'];  // ok
}

interface MixedIndexSigUsedInUnion {
  [key: string]: string;
  namedProp2: string;
}

function unionType(x: MixedIdxSig|MixedIndexSigUsedInUnion) {
  x.prop;     // error
  x['prop'];  // ok
}

/**
 * Curiously Record<string, T> is treated like an index signature.
 */
function recordStringType(x: Record<string, number>) {
  x.prop;     // error
  x['prop'];  // ok
}

/**
 * But narrowing the generic parameter to a string literal union exempts it.
 */
function recordNarrowType(x: Record<'prop'|'other', number>) {
  x.prop;     // ok
  x['prop'];  // ok
}

/**
 * Similary, to Records mapped types of of 'in string' are threated like a
 * string index signature.
 */
function mappedType(x: {[x in string]: boolean}) {
  x.prop;     // error
  x['prop'];  // ok
}
