import {Proto} from './car';

const serverResponse = `{"make": "Porsche"}`;
const car = Proto.Car.create(JSON.parse(serverResponse));
const el: HTMLDivElement = document.createElement('div');
el.innerText = `Car from server: ${car.make}`;
el.className = 'ts1';
document.body.appendChild(el);
