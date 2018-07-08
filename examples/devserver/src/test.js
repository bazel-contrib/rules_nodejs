import m from 'my-lib';
import com from './dir/module';
import comment from './module';

const el = document.createElement('div');
el.innerText = `Hello, ${comment} ${com} ${m}`;
el.className = 'js';
document.body.appendChild(el);
