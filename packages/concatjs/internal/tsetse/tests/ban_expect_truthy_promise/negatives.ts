function expect(x: {}): ClassWithTruthy {
  return new ClassWithTruthy();
}

class ClassWithTruthy {
  toBeTruthy() {}
}

new ClassWithTruthy().toBeTruthy();
expect(Promise.resolve(1)).toBeTruthy();
