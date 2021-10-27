// tslint:disable

const a = JSON.parse('{}');
let b = JSON.parse('{}');
if (JSON.parse('false')) {
  alert('never happens');
}

export {};  // Make this file a module.
