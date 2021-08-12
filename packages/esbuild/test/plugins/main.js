// The example esbuild plugin loads the txt file and splits on each word.
// 'words' results in an array of the words from the txt file.
import { default as words } from './words.txt';

// The SVG plugin loads the svg and sets the file contents to the 'logo' symbol
import logo from './logo.svg';

console.log(words);

console.log(logo);
