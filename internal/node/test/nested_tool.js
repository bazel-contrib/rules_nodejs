RUNFILES = process.env.RUNFILES

if (RUNFILES.endsWith('.sh.runfiles')) {
  console.error('RUNFILES should be the runfiles of the tool that invoked this, not ', RUNFILES)
  process.exit(1)
}
