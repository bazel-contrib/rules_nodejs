import {format} from 'date-fns';

import {user} from './user';

const date: string = format(new Date(2019, 4, 7), 'MMMM D, YYYY');
export const foo = `Sunnyvale ${user} ${date}`;
