export {};

// string.trim() result is unused
let stringUnused;
stringUnused = 'hello';
stringUnused.trim();
const stringLiteralUnused = 'hello';
stringLiteralUnused.trim();

// Array.concat() result is unused.
const arrayOfStringsUnused = ['hello'];
arrayOfStringsUnused.concat(arrayOfStringsUnused);

// Object.create() result is unused
const objectUnused = {};
Object.create(objectUnused);

// string.replace() with a substring
stringUnused.replace('o', 'O');
