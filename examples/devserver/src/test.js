import comment from './module';
import com from './dir/module';

const el = document.createElement('div');
el.innerText = `Hello, ${comment} ${com}`;
el.className = 'js';
document.body.appendChild(el);
