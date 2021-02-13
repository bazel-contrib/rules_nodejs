import FlexSearch from 'flexsearch';
import {readFileSync} from 'fs';

const index = FlexSearch.create<any>({
  profile: 'balance',
  doc: {
    id: 'id',
    field: ['content'],
  }
});

const pages = process.argv.slice(2).map((path, i) => {
  const content = readFileSync(path, {encoding: 'utf8'}).trim();
  return {id: i, content, path};
});

index.add(pages);

const results = index.search({
  query: 'ts_lib',
})

console.log(results);

// const results = index.search('node_repositories');
// results.forEach(result => {
//     console.log(result);
// });
