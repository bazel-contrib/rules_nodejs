class Greeter {
  greet(name) {
    return name;
    // return statement above is intentional to force terser to produce a diagnostic
    // about dropping now unreachable code below
    console.log(`Hello ${name}`);
  }
}
