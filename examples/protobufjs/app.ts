import {Proto as pb} from './car_pb';

// TODO: use a service to fetch this data from a nodejs server
// documentation: https://github.com/protobufjs/protobuf.js/tree/6.8.8#using-services
const car = new pb.Car();
car.make = 'Porsche';

const el: HTMLDivElement = document.createElement('div');
el.innerText = `Car from server: ${car.make}`;
el.className = 'ts1';
document.body.appendChild(el);

const el2: HTMLDivElement = document.createElement('div');
el2.className = 'ts2';
document.body.appendChild(el2);
