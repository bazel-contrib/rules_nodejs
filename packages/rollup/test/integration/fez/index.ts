import {format} from 'date-fns';

const date: string = format(new Date(2019, 4, 7), 'MMMM D, YYYY');
export const fez = `fezlib ${date}`;
