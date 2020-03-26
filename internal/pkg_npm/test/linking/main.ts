import {bar as scoped_bar} from '@scoped/bar';
import {baz as scoped_baz} from '@scoped/baz';
import {feb as scoped_feb} from '@scoped/feb';
import {fez as scoped_fez} from '@scoped/fez';
import {foo as scoped_foo} from '@scoped/foo';
import {foo as scoped_foo_js} from '@scoped/foo_js';
import {foz as scoped_foz} from '@scoped/foz';
import {foz as scoped_foz_js} from '@scoped/foz_js';
import {fub as scoped_fub} from '@scoped/fub';
import {fuz as scoped_fuz} from '@scoped/fuz';
import {bar} from 'bar';
import {baz} from 'baz';
import {feb} from 'feb';
import {fez} from 'fez';
import {foo} from 'foo';
import {foo as foo_js} from 'foo_js';
import {foz} from 'foz';
import {foz as foz_js} from 'foz_js';
import {fub} from 'fub';
import {fuz} from 'fuz';

const expected = {
  'bar': [
    bar,
    scoped_bar,
  ],
  'baz': [
    baz,
    scoped_baz,
  ],
  'feb': [
    feb,
    scoped_feb,
  ],
  'fez': [
    fez,
    scoped_fez,
  ],
  'foo': [
    foo_js,
    scoped_foo_js,
    foo,
    scoped_foo,
  ],
  'foz': [
    foz_js,
    scoped_foz_js,
    foz,
    scoped_foz,
  ],
  'fub': [
    fub,
    scoped_fub,
  ],
  'fuz': [
    fuz,
    scoped_fuz,
  ],
}

for (const k of Object.keys(expected)) {
  for (const i of expected[k]) {
    if (i !== k) {
      throw new Error(`Expected '${i}' to be '${k}'`);
    }
  }
}

console.log('Success!');