import {format} from 'date-fns';

const el: HTMLDivElement = document.createElement('div');
const date: string = format(new Date(2019, 4, 7), 'MMMM D, YYYY');
el.innerText = `Hello, TypeScript today is ${date}`;
el.className = 'ts1';
document.body.appendChild(el);
