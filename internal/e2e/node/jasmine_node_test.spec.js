describe('jasmine_node_test', () => {
  it('should capture all stack frames', () => {
    try {
      deepThrow0();
      fail();
    } catch (e) {
      const trace = e.stack;
      const lines = trace.split(/\n/);
      // Assert that we capture more than 10 frames (the default);
      expect(lines.length > 12).toBeTruthy();
      expect(trace.indexOf('deepThrow0')).toBeTruthy();
      expect(trace.indexOf('deepThrow12')).toBeTruthy();
    }
  });
});

function deepThrow0() {
  deepThrow1();
}
function deepThrow1() {
  deepThrow2();
}
function deepThrow2() {
  deepThrow3();
}
function deepThrow3() {
  deepThrow4();
}
function deepThrow4() {
  deepThrow5();
}
function deepThrow5() {
  deepThrow6();
}
function deepThrow6() {
  deepThrow7();
}
function deepThrow7() {
  deepThrow8();
}
function deepThrow8() {
  deepThrow9();
}
function deepThrow9() {
  deepThrow10();
}
function deepThrow10() {
  deepThrow11();
}
function deepThrow11() {
  deepThrow12();
}
function deepThrow12() {
  throw new Error('Deep Stack');
}
