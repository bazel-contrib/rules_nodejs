export function shorten(s: string, length: number) {
  if (s.length < length) return s;
  return s.substr(0, length - 3) + '...';
}