import {name} from './bar';
import {fum} from 'fumlib';

console.log(`Hello, ${name} in ${fum}`);

/** This class should be tree-shaken away */
var ReflectiveInjector = /** @class */ (function () {
  function ReflectiveInjector() {
  }
  return ReflectiveInjector;
}());

/** This class should be tree-shaken away */
var ReflectiveInjector_ = /** @class */ (function () {
  function ReflectiveInjector_(_providers, _parent) {}
  ReflectiveInjector_.prototype.resolveAndInstantiate =
  function (provider) {
    return ReflectiveInjector;
  };
  Object.defineProperty(ReflectiveInjector_, "displayName", "foo");
  return ReflectiveInjector_;
}());

ngDevMode && console.log("Should have been tree-shaken");

// Test for sequences = false
class A {
  a() { return document.a; }
}
console.error(new A().a());
