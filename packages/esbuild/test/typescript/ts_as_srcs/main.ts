import {QUESTION} from '@rnj/questions';

import {UnhelpfulService} from './service';

const service = new UnhelpfulService();
const answer = service.question(QUESTION);

console.log(answer);
