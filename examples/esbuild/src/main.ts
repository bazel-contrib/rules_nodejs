import chalk from 'chalk';

import {NAME} from './name';

export function greeting(name: string): string {
  return `Hello ${chalk.bold(name)}!`;
}

const sentence = greeting(NAME);
console.log(sentence);
