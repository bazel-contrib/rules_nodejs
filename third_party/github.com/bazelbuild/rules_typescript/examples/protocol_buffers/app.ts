import {Car} from './car';

const serverResponse = `{"make": "Porsche"}`;
const car = Car.create(JSON.parse(serverResponse));
const el: HTMLDivElement = document.createElement('div');
el.innerText = `Car from server: ${car.make}`;
document.body.appendChild(el);
