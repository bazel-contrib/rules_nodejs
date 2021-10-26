// The line below is a strict deps violation of a ts_library dep
import {Symbol} from './grandparent';

console.log(Symbol);
