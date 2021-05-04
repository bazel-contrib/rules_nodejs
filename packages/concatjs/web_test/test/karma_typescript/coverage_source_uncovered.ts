// noting in  this file should be required, so we can test the c8 feature all: true
// which will pick up files that aren't directly referenced by test files
// but are added to coverage as empty coverage
export function notCalled(input: number) {
  return input * 13;
}