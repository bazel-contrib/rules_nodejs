import { detect } from 'detect-browser';
import { NAME } from './name';

const browser = detect();
const root = document.getElementById('root');

root!.innerText = `Hello ${NAME}! (${browser.name} ${browser.version} on ${browser.os})`;
