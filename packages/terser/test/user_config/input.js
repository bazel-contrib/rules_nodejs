// Assert that the terser_config.json was used. It disables the arrows setting:
//   arrows (default: true) -- Converts ()=>{return x} to ()=>x.
// The output.golden.js_ has the braces and return keyword still present
const a = () => {
  return 'hello'
};
