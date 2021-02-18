import {getId as mdyn} from '@typescript/module-dynamic';
import {getId as m1Id} from '@typescript/module-one';
import {getId as m2Id} from '@typescript/module-two';

import {getId as mGenId} from './generated-module/lib';
import {getId as mRelId} from './relative-module/lib';

export const ID = `Full ID: ${m1Id()} - ${m2Id()} - ${mdyn()} - ${mRelId()} - ${mGenId()}`;

console.log(ID);
