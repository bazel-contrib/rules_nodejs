import {format} from 'date-fns'

export function sayDate() {
  return 'hello ' + format(new Date(2014, 1, 11), 'MM/dd/YYYY');
}
