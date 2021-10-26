// Cecking that `describe` is a valid symbol here to ensure
// that @types/jasmine is getting picked up
describe('', () => {});
// Since "hammerjs" is not included in the types=[] array in
// tsconfig, this should result in a compile error: TS2304: Cannot find name 'Hammer'
console.log(typeof Hammer);
