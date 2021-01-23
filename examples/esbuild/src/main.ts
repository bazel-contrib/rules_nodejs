import {NAME} from './name';

export function greeting(name: string): string {
  return `Hello ${name}!`;
}

const sentance = greeting(NAME);
console.log(sentance);
