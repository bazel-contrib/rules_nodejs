export function dynamic() {
  return import('./dep4.js').then(dep4 => {
    return dep4.fn();
  });
}