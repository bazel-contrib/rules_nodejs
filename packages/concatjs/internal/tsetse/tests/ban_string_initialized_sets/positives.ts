// tslint:disable
function setWithStringLiteral() {
  const set = new Set('abc');
}

function setWithStringVariable(s: string) {
  const set = new Set(s);
}

function setWithStringUnionType(s: string|string[]) {
  const set = new Set(s);
}

function setWithStringExpression(fn: () => string) {
  const set = new Set(fn());
}

function setWithStringExpression2() {
  const set = new Set(Math.random() < 0.5 ? 'a' : 'b');
}

type TypeA = string|Set<string>;
type TypeB = TypeA|(Iterable<string>&IterableIterator<string>);
function setWithComplexInitializationType(s: TypeB) {
  const set = new Set(s);
}

function setWithUnionStringType(s: string&{toString(): string}) {
  const set = new Set(s);
}

function setWithLocalAlias() {
  const TotallyNotASet = Set;
  const set = new TotallyNotASet('abc');
}

function setWithMultipleAliases() {
  const Foo = Set;
  const Bar = Foo;
  const Baz = Bar;
  const set = new Baz('abc');
}

function setUsingSetConstructorType(ctor: SetConstructor) {
  const set = new ctor('abc');
}

type MySet = SetConstructor;
function setUsingAliasedSetConstructor(ctor: MySet) {
  const set = new ctor('abc');
}
