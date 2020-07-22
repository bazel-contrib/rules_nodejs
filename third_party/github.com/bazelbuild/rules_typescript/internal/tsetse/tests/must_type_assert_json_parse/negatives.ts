// tslint:disable
if (JSON.parse('false') as boolean) {
  alert('never happens');
}

if (JSON.parse('null') as null) {
  alert('never happens');
}

declare interface MyInterface {
  attr: string;
}

const a = JSON.parse('{}') as any;
const b = JSON.parse('{}') as unknown;
const c = JSON.parse('{}') as MyInterface;

let d = JSON.parse('{}') as any;
let e = JSON.parse('{}') as unknown;
let f = JSON.parse('{}') as MyInterface;

{
  const JSON = {parse: (a: any) => a};
  let g = JSON.parse('{}');  // User defined JSON, so no error.
}

export {};  // Make this file a module.
