const { FEATURES } = require('./feature-names');

// This will match"
// <a mat-list-item routerLink="/storage"><mat-icon>folder</mat-icon> Storage </a>
module.exports.routeLinkRegex = new RegExp(`<a.*?routerLink="\/(${FEATURES.map(feature => feature.path).join('|')})">[\\w\\W\\s'"<>]+?<\/a>`, 'mg');

// Transforms "word-word" to "Word Word" or "WordWord"
module.exports.humanize = function humanize(str, removeSpaces = false) {
  str = str.replace(/\-/g, ' ')
    .trim()
    // lowercase all word blocks
    .replace(/\b[A-Za-z]+\b/g, (word) => word.toLowerCase())
    // uppercase first letter of each block
    .replace(/(^[a-z]|\s[a-z])/g, (first) => first.toUpperCase())

  if (removeSpaces) {
    str = str.replace(/\s*/g, '');
  }

  return str;
};