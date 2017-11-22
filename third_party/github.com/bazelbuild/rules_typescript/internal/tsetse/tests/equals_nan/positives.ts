// tslint:disable
const equalsNan = 1 === NaN;

declare const x: number;

if (x === NaN) alert('never happens');
if (x == NaN) alert('never happens');

NaN === NaN;
NaN === 0 / 0;

export {}  // Make this file a module.
