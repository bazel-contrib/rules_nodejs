import * as foo from 'foo';

export function takesOnlyTheNumber5(num: 5) {
  return num;
}

function takesOnlyTheNumber3(num: AGlobalNumber3) {
  return num;
}

takesOnlyTheNumber5(foo.bar)

takesOnlyTheNumber3(3);