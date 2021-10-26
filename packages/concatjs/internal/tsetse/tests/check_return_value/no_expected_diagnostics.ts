// Array.pop() has side effects
const arrayUsedWithSideEffects = [1];
arrayUsedWithSideEffects.pop();

// string.replace() result is assigned to a variable
const stringFunctionAssignedToVar = 'hello';
let world;
world = stringFunctionAssignedToVar.replace('hello', 'world');

// string.replace() result is used as an argument to another function
const stringUsedInFunctionArguments = 'hello';
console.debug(stringUsedInFunctionArguments.replace('hello', 'world'));

// string.replace() result is returned
export function foo(): string {
  const stringUsedInFunctionReturn = 'hello';
  return stringUsedInFunctionReturn.replace('hello', 'world');
}

function aRandomFunctionShouldNotTriggerThisRule() {}
aRandomFunctionShouldNotTriggerThisRule();

const stringFunctionUsedInIf = 'hello';
if (stringFunctionUsedInIf.trim()) {
}

// string.replace() with a function
const matches: string[] = [];
'hello'.replace('l', (s) => {
  matches.push(s);
  return s;
});
