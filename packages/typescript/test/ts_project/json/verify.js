const files = process.argv.slice(2)
let barJson
let subdirFooJson
files.forEach(f => {
  if (f.endsWith('bar.json')) {
    barJson = f
  } else if (f.endsWith('subdir/foo.json')) {
    subdirFooJson = f
  }
})
if (!barJson) {
  console.error('Missing bar.json')
  process.exitCode = 1
}
else if (!subdirFooJson) {
  console.error('Missing subdir/foo.json')
  process.exitCode = 1
}