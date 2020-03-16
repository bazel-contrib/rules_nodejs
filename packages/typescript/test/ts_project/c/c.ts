import {a} from '../a/a';  // SHOULD FAIL HERE per https://github.com/microsoft/TypeScript/issues/36743
import {sayHello} from '../b/b';

sayHello('world');
console.error(a);
