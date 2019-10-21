import * as _ from 'lodash';
export function shorten(s: string, length: number) {
  return _.truncate(s, {length});
}