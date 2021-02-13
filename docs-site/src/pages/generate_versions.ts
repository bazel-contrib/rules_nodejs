import {readFileSync} from 'fs';
import {compare} from 'semver';

import {DocsInfo, PageMetadata} from '../app/doc.types';

const pages = process.argv.splice(2);
const data: DocsInfo = {};

pages.forEach(page => {
  // page is actually a file path, the last two sections should give the version and filename
  // some are rooted in bazel-out, and others in the input tree

  const segments = page.split('/');
  const name = segments.pop();
  const version = segments.pop();

  if (!data[version]) {
    data[version] = {version, navs: {page: [], rule: []}};
  }

  const navs = data[version].navs;

  const file = readFileSync(page, {encoding: 'utf8'});
  const lines = file.split('\n');
  if (lines[0].trim().startsWith('<!--')) {
    // in the metadata
    // grab it
    const meta: PageMetadata = {
      md: name.split('.').slice(0, -1).join('.'),
      ordinality: -1,
      title: '',
    };

    let start = 1;
    let line = lines[start];

    while (!line.trim().endsWith('-->')) {
      const item = line.split(':');
      const key = item[0].trim().toLowerCase();
      let value: any = item[1].trim();

      if (key === 'ordinality') {
        value = Number(value);
      } else if (key === 'toc') {
        value = (value as string).toLowerCase() === 'true';
      }

      meta[key] = value;
      line = lines[++start];
    }

    if (meta.nav) {
      navs[meta.nav].push(meta);
    }
    return;
  }
});

Object.keys(data).forEach(version => {
  data[version].navs.rule.sort((a, b) => (a.title as string).localeCompare(b.title));
  data[version].navs.page.sort((a, b) => a.ordinality - b.ordinality);
});

const versions = Array.from(Object.keys(data)).sort((a, b) => {
  if (a === 'HEAD' || b === 'HEAD') {
    return 1;
  }

  return compare(b, a, {includePrerelease: true});
});

const file = [
  `export const DOCSINFO = ${JSON.stringify(data, null, 2)};`,
  `export const VERSIONS = ${JSON.stringify(versions)};`
];

console.log(file.join('\n'));
