import { Car } from "examples_protocol_buffers/car_pb";
import * as React from "react";
import * as ReactDOM from "react-dom";

const car = new Car();
car.setMake("Porsche");

ReactDOM.render(
  <h1 className="ts1">Car from server: {car.getMake()}</h1>,
  document.getElementById("root")
);
