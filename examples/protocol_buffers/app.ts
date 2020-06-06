import {CarServiceClient} from 'examples_protocol_buffers/car_grpc_web_pb';
import {Car} from 'examples_protocol_buffers/car_pb';

const car = new Car();
car.setMake('Porsche');

const el: HTMLDivElement = document.createElement('div');
el.innerText = `Car from server: ${car.getMake()}`;
el.className = 'ts1';
document.body.appendChild(el);

const el2: HTMLDivElement = document.createElement('div');
el2.innerText = `CarServiceClient is defined: ${CarServiceClient ? 'yes!' : 'no :('}`;
el2.className = 'ts2';
document.body.appendChild(el2);
