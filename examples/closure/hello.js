import {greet} from 'goog:demo';

function hello(name) {
  const template = greet({
    name: name,
  });
  alert(template.getContent());
}
hello('New user');
