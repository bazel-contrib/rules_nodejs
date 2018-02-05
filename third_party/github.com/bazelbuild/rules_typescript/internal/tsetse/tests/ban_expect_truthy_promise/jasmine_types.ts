// Abbreviated Jasmine types for testing purposes

declare function describe(
    description: string, specDefinitions: () => void): void;
declare function it(
    expectation: string, assertion?: (done: Function) => void,
    timeout?: number): void;
declare function expect(actual: any): Matchers;

interface Matchers {
  toBeTruthy(expectationFailOutput?: any): boolean;
  toBeFalsy(expectationFailOutput?: any): boolean;
  not: Matchers;
}
