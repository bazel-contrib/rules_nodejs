import {format} from 'date-fns'

export function sayFive() {
  return 'Hello ' + format(new Date(2014, 1, 11), 'MM/dd/YYYY');
}
